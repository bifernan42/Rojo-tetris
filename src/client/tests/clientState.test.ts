import { describe, expect, it } from 'vitest';
import reducer, {
  initialState, connected, disconnected, connectFailed, registerPlayer, registered,
  roomStateReceived, errorReceived, resetSession, setHardMode, canSendPlayerMoves, areSessionRequestsBlocked, type SessionState,
} from '../state/clientState';
import type { GameSnapshot, RoomState } from '../../common/protocol';
import { createGame } from '../../engine/game';
import { createTetromino } from '../../engine/tetrominoes';

const room: RoomState = {
  name: 'r', hostId: 'a', winnerId: null, winnerName: null, status: 'PLAYING', players: [], hardMode: false,
};

describe('clientState updates', () => {
  it('tracks connection lifecycle', () => {
    let s = reducer(initialState, connected('id1'));
    expect(s.connection).toBe('connected');
    expect(s.playerId).toBe('id1');
    s = reducer({ ...s, pending: 'join' }, disconnected());
    expect(s).toMatchObject({ connection: 'disconnected', pending: null });
    expect(reducer(initialState, connectFailed()).error).toMatch(/Cannot reach/);
  });

  it('sets pending on intent and clears it on server reply', () => {
    let s = reducer({ ...initialState, error: 'old' }, registerPlayer('bob'));
    expect(s).toMatchObject({ pending: 'register', error: '' });
    s = reducer(s, registered('bob'));
    expect(s).toMatchObject({ pending: null, registeredName: 'bob' });
    s = reducer({ ...s, pending: 'join', error: 'x' }, roomStateReceived(room));
    expect(s).toMatchObject({ room, pending: null, error: '' });
    s = reducer({ ...s, pending: 'start' }, errorReceived('boom'));
    expect(s).toMatchObject({ error: 'boom', pending: null });
  });

  it('marks a hard mode change as pending until the server answers', () => {
    let s = reducer({ ...initialState, error: 'old' }, setHardMode(true));
    expect(s).toMatchObject({ pending: 'hardMode', error: '' });
    s = reducer(s, roomStateReceived({ ...room, hardMode: true }));
    expect(s).toMatchObject({ pending: null });
    expect(s.room?.hardMode).toBe(true);
    s = reducer(reducer(s, setHardMode(false)), errorReceived('Only Host Allowed'));
    expect(s).toMatchObject({ pending: null, error: 'Only Host Allowed' });
  });

  it('resets to the initial state', () => {
    expect(reducer({ ...initialState, currentScreen: 'room', room }, resetSession())).toEqual(initialState);
  });
});

describe('selectors', () => {
  const game: GameSnapshot = {
    ...createGame(createTetromino('O')),
    score: 0,
    elapsedMs: 0,
    nextTetromino: createTetromino('T'),
  };
  const playing: SessionState = { ...initialState, connection: 'connected', room, game };

  it('canSendPlayerMoves requires a live, playing, non-over game', () => {
    expect(canSendPlayerMoves(playing)).toBe(true);
    expect(canSendPlayerMoves({ ...playing, game: { ...game, gameOver: true } })).toBe(false);
    expect(canSendPlayerMoves({ ...playing, connection: 'disconnected' })).toBe(false);
  });

  it('areSessionRequestsBlocked while disconnected or pending', () => {
    expect(areSessionRequestsBlocked(playing)).toBe(false);
    expect(areSessionRequestsBlocked({ ...playing, pending: 'join' })).toBe(true);
    expect(areSessionRequestsBlocked(initialState)).toBe(true);
  });
});
