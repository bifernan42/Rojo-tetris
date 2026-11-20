import { describe, expect, it, vi } from 'vitest';
import { createClientState } from '../state/createClientState';
import type { ClientSocket } from '../state/handleServerCommunication';
import {
  connect, disconnect, joinRoom, registerPlayer, resetSession, sendGameCommand, sendMove, setHardMode,
} from '../state/clientState';
import type { GameSnapshot, RoomState } from '../../common/protocol';
import { createGame } from '../../engine/game';
import { createTetromino } from '../../engine/tetrominoes';

/** Fake socket: records emits and lets the test simulate server events. */
function fakeSocket() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    id: 'sock-1',
    on: vi.fn((event: string, fn: (...args: unknown[]) => void) => { handlers.set(event, fn); return socket; }),
    emit: vi.fn(),
    connect: vi.fn(() => socket),
    disconnect: vi.fn(() => socket),
    server(event: string, ...args: unknown[]) { handlers.get(event)?.(...args); },
  };
  return socket;
}

function setup() {
  const socket = fakeSocket();
  const clientState = createClientState(socket as unknown as ClientSocket);
  return { socket, clientState };
}

const room: RoomState = {
  name: 'r', hostId: 'sock-1', winnerId: null, winnerName: null, status: 'PLAYING', players: [], hardMode: false,
};

describe('handleServerCommunication', () => {
  it('connect action opens the socket; server connect updates state', () => {
    const { socket, clientState } = setup();
    clientState.dispatch(connect({}));
    expect(socket.connect).toHaveBeenCalled();
    expect(clientState.getState().connection).toBe('connecting');
    socket.server('connect');
    expect(clientState.getState()).toMatchObject({ connection: 'connected', playerId: 'sock-1' });
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('auto registers then joins from URL params', () => {
    const { socket, clientState } = setup();
    clientState.dispatch(connect({ urlRoom: 'r', urlPlayer: 'bob' }));
    socket.server('connect');
    expect(socket.emit).toHaveBeenCalledWith('player:register', 'bob');
    expect(clientState.getState().pending).toBe('register');
    socket.server('player:registered', { id: 'sock-1', name: 'bob' });
    expect(socket.emit).toHaveBeenLastCalledWith('room:join', 'r');
    expect(clientState.getState()).toMatchObject({ registeredName: 'bob', pending: 'join' });
    socket.server('room:state', room);
    expect(clientState.getState()).toMatchObject({ room, pending: null });
  });

  it('emits intents only when allowed', () => {
    const { socket, clientState } = setup();
    clientState.dispatch(registerPlayer('bob'));
    expect(socket.emit).not.toHaveBeenCalled();
    expect(clientState.getState().pending).toBeNull();

    socket.server('connect');
    clientState.dispatch(joinRoom({ roomName: 'r', intent: 'create' }));
    expect(socket.emit).toHaveBeenCalledWith('room:join', 'r', 'create');
    clientState.dispatch(sendGameCommand('start'));
    expect(socket.emit).toHaveBeenCalledTimes(1);

    socket.server('room:error', 'nope');
    expect(clientState.getState()).toMatchObject({ error: 'nope', pending: null });
    clientState.dispatch(sendGameCommand('start'));
    expect(socket.emit).toHaveBeenLastCalledWith('game:start');
  });

  it('emits hard mode changes only when connected and not pending', () => {
    const { socket, clientState } = setup();
    clientState.dispatch(setHardMode(true));
    expect(socket.emit).not.toHaveBeenCalled();

    socket.server('connect');
    clientState.dispatch(setHardMode(true));
    expect(socket.emit).toHaveBeenCalledWith('room:hardMode', true);
    expect(clientState.getState().pending).toBe('hardMode');
    clientState.dispatch(setHardMode(false));
    expect(socket.emit).toHaveBeenCalledTimes(1);

    socket.server('room:state', { ...room, status: 'WAITING', hardMode: true });
    expect(clientState.getState()).toMatchObject({ pending: null });
    expect(clientState.getState().room?.hardMode).toBe(true);
    clientState.dispatch(setHardMode(false));
    expect(socket.emit).toHaveBeenLastCalledWith('room:hardMode', false);
  });

  it('sends moves only while playing', () => {
    const { socket, clientState } = setup();
    socket.server('connect');
    clientState.dispatch(sendMove('HARD_DROP'));
    expect(socket.emit).not.toHaveBeenCalled();

    socket.server('room:state', room);
    const game: GameSnapshot = {
      ...createGame(createTetromino('O')),
      score: 0,
      elapsedMs: 0,
      nextTetromino: createTetromino('T'),
    };
    socket.server('game:state', game);
    socket.server('game:spectra', []);
    clientState.dispatch(sendMove('HARD_DROP'));
    expect(socket.emit).toHaveBeenCalledWith('game:action', 'HARD_DROP');
  });

  it('handles connect_error, disconnect and reset', () => {
    const { socket, clientState } = setup();
    socket.server('connect_error');
    expect(socket.disconnect).toHaveBeenCalled();
    expect(clientState.getState().error).toMatch(/Cannot reach/);

    socket.server('connect');
    socket.server('disconnect');
    expect(clientState.getState().connection).toBe('disconnected');

    clientState.dispatch(disconnect());
    clientState.dispatch(resetSession());
    expect(socket.disconnect).toHaveBeenCalledTimes(3);
    expect(clientState.getState().currentScreen).toBe('menu');
  });
});
