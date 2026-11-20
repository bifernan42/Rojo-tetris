import { useEffect, useLayoutEffect, useRef } from 'react';
import type { GameCommand, PlayerMove, RoomIntent } from '../../common/protocol';
import { useClientActions, useClientState } from '../state/createClientState';
import {
  connect, disconnect, resetSession as resetSessionAction, setCurrentScreen as setCurrentScreenAction,
  registerPlayer as registerPlayerAction, joinRoom as joinRoomAction,
  sendGameCommand as sendGameCommandAction, sendMove, canSendPlayerMoves, areSessionRequestsBlocked, type CurrentScreen,
  setHardMode as setHardModeAction,
} from '../state/clientState';

/** Connects the React screen to the client state. Knows nothing about the socket. */
export default function useGameSession(urlRoom: string | undefined, urlPlayer: string | undefined) {
  const sendClientAction = useClientActions();
  const session = useClientState((s) => s);
  const canPlay = useClientState(canSendPlayerMoves);
  const disabled = useClientState(areSessionRequestsBlocked);
  const { currentScreen, connection, playerId, game, registeredName, room, error, spectra } = session;

  // Layout effect: switch screens before paint so /:room and /:room/:player never flash the menu.
  useLayoutEffect(() => {
    if (urlRoom) sendClientAction(setCurrentScreenAction('room'));
  }, [sendClientAction, urlRoom]);

  // URL params are read when the session starts, not tracked: once in a room, the URL is
  // rewritten to /:room/:player (see App) and that must not tear down the socket.
  const urlParams = useRef({ urlRoom, urlPlayer });
  useLayoutEffect(() => {
    urlParams.current = { urlRoom, urlPlayer };
  }, [urlRoom, urlPlayer]);

  useEffect(() => {
    if (currentScreen === 'menu') return;
    sendClientAction(connect(urlParams.current));
    return () => { sendClientAction(disconnect()); };
  }, [sendClientAction, currentScreen]);

  return {
    currentScreen, connection, playerId, game, registeredName, room, error, spectra, canPlay, disabled,
    setCurrentScreen: (next: CurrentScreen) => sendClientAction(setCurrentScreenAction(next)),
    resetSession: () => sendClientAction(resetSessionAction()),
    registerPlayer: (name: string) => sendClientAction(registerPlayerAction(name)),
    joinRoom: (roomName: string, intent: RoomIntent) => sendClientAction(joinRoomAction({ roomName, intent })),
    sendMove: (action: PlayerMove) => sendClientAction(sendMove(action)),
    sendGameCommand: (action: GameCommand) => sendClientAction(sendGameCommandAction(action)),
    setHardMode: (enabled: boolean) => sendClientAction(setHardModeAction(enabled)),
  };
}
