import type { Middleware } from '@reduxjs/toolkit';
import { io, type Socket } from 'socket.io-client';
import {
  GAME_COMMAND_EVENTS, SocketEvent, type GameSnapshot, type PlayerIdentity, type PlayerSpectrum, type RoomState,
} from '../../common/protocol';
import {
  connect, disconnect, resetSession, registerPlayer, joinRoom, sendGameCommand, sendMove,
  connected, disconnected, connectFailed, registered, roomStateReceived, gameStateReceived,
  spectraReceived, errorReceived, canSendPlayerMoves, areSessionRequestsBlocked, setHardMode, type SessionState,
} from './clientState';

/** Minimal socket surface used by the middleware (lets tests inject a fake). */
export type ClientSocket = Pick<Socket, 'id' | 'on' | 'emit' | 'connect' | 'disconnect'>;

export function createDefaultSocket(): ClientSocket {
  return io({ autoConnect: false, reconnection: false });
}

/**
 * The only bridge between Redux and socket.io.
 * - Server events  -> dispatch "received" actions.
 * - Intent actions -> socket.emit / connect / disconnect.
 */
export function handleServerCommunication(socket: ClientSocket = createDefaultSocket()): Middleware<object, SessionState> {
  return (clientState) => {
    // URL params from the last `connect`, used to auto register/join on /:room/:player.
    let urlRoom: string | undefined;
    let urlPlayer: string | undefined;

    socket.on('connect', () => {
      clientState.dispatch(connected(socket.id));
      if (urlRoom && urlPlayer) clientState.dispatch(registerPlayer(urlPlayer));
    });
    socket.on('disconnect', () => clientState.dispatch(disconnected()));
    socket.on('connect_error', () => {
      socket.disconnect();
      clientState.dispatch(connectFailed());
    });
    socket.on(SocketEvent.playerRegistered, (player: PlayerIdentity) => {
      clientState.dispatch(registered(player.name));
      if (urlRoom) clientState.dispatch(joinRoom({ roomName: urlRoom }));
    });
    socket.on(SocketEvent.roomState, (state: RoomState) => clientState.dispatch(roomStateReceived(state)));
    socket.on(SocketEvent.gameState, (state: GameSnapshot) => clientState.dispatch(gameStateReceived(state)));
    socket.on(SocketEvent.gameSpectra, (data: PlayerSpectrum[]) => clientState.dispatch(spectraReceived(data)));
    for (const event of [SocketEvent.playerError, SocketEvent.roomError, SocketEvent.gameError]) {
      socket.on(event, (message: string) => clientState.dispatch(errorReceived(message)));
    }

    return (next) => (action) => {
      if (connect.match(action)) {
        ({ urlRoom, urlPlayer } = action.payload);
        const result = next(action);
        socket.connect();
        return result;
      }
      if (disconnect.match(action) || resetSession.match(action)) {
        urlRoom = urlPlayer = undefined;
        const result = next(action);
        socket.disconnect();
        return result;
      }
      if (sendMove.match(action)) {
        if (!canSendPlayerMoves(clientState.getState())) return;
        socket.emit(SocketEvent.gameAction, action.payload);
        return next(action);
      }
      if (registerPlayer.match(action) || joinRoom.match(action) || sendGameCommand.match(action) || setHardMode.match(action)) {
        if (areSessionRequestsBlocked(clientState.getState())) return;
        const result = next(action);
        if (registerPlayer.match(action)) socket.emit(SocketEvent.registerPlayer, action.payload);
        else if (sendGameCommand.match(action)) socket.emit(GAME_COMMAND_EVENTS[action.payload]);
        else if (setHardMode.match(action)) socket.emit(SocketEvent.setHardMode, action.payload);
        else if (action.payload.intent) socket.emit(SocketEvent.joinRoom, action.payload.roomName, action.payload.intent);
        else socket.emit(SocketEvent.joinRoom, action.payload.roomName);
        return result;
      }
      return next(action);
    };
  };
}
