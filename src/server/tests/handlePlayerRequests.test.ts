import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';
import type { GameState } from '../../engine/game';
import type { RoomState, ScoreEntry } from '../../common/protocol';
import { PlayerRequestHandler } from '../PlayerRequestHandler';
import { RoomGameManager, HARD_TICK_MS, NORMAL_TICK_MS } from '../RoomGameManager';

type Emission = { target: string; event: string; payload: unknown };

// Exercise the real room/game models through a synchronous transport boundary.
function createHarness() {
  const emissions: Emission[] = [];
  let connect: (socket: Socket) => void;
  const emit = (target: string, event: string, payload: unknown) => {
    emissions.push({ target, event, payload: structuredClone(payload) });
  };
  const io = {
    on: (_event: string, handler: (socket: Socket) => void) => {
      connect = handler;
    },
    to: (target: string) => ({
      emit: (event: string, payload: unknown) => emit(target, event, payload),
    }),
  };
  const saveScore = vi.fn<(entry: ScoreEntry) => void>();
  const gameManager = new RoomGameManager(io as unknown as Server, saveScore);
  new PlayerRequestHandler(io as unknown as Server, gameManager).registerEvents();

  function client(id: string) {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    const join = vi.fn();
    const socket = {
      id,
      on: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, handler);
      },
      emit: (event: string, payload: unknown) => emit(id, event, payload),
      join,
    };
    connect(socket as unknown as Socket);
    return {
      join,
      send: (event: string, ...args: unknown[]) => handlers.get(event)!(...args),
    };
  }

  function latest<T>(target: string, event: string): T {
    const emission = emissions.filter(item => item.target === (event === 'room:state' || event === 'game:spectra' ? `room:${target}` : target) && item.event === event).at(-1);
    expect(emission).toBeDefined();
    return emission!.payload as T;
  }

  function joinRoom(id: string) {
    const player = client(id);
    player.send('player:register', id);
    player.send('room:join', 'room');
    return player;
  }

  return { emissions, client, latest, joinRoom };
}

describe('PlayerRequestHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('validates payloads and distinguishes create/join without losing legacy links', () => {
    const { client, latest } = createHarness();
    const host = client('host');
    host.send('room:join', 'room');
    expect(latest('host', 'room:error')).toBe('user should be registered first');
    for (const invalid of [null, {}, 42, ' ', 'x'.repeat(31)]) {
      host.send('player:register', invalid);
      expect(latest('host', 'player:error')).toBe('Invalid player name');
    }
    host.send('player:register', ' Alice ');
    expect(latest('host', 'player:registered')).toEqual({ id: 'host', name: 'Alice' });
    host.send('room:join', null);
    expect(latest('host', 'room:error')).toBe('Bad room name');
    host.send('room:join', 'room', 'invalid');
    expect(latest('host', 'room:error')).toBe('Invalid room action');
    host.send('room:join', 'room', 'join');
    expect(latest('host', 'room:error')).toBe('Room not found');
    host.send('room:join', 'room', 'create');
    expect(host.join).toHaveBeenCalledWith('room:room');
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({
      hostId: 'host', status: 'WAITING', winnerId: null,
    });
    host.send('player:register', 'Renamed');
    expect(latest('host', 'player:error')).toContain('Leave your current room');
    host.send('room:join', 'other');
    expect(latest('host', 'room:error')).toBe('player already in a room');
    const guest = client('guest');
    guest.send('player:register', 'Guest');
    guest.send('room:join', 'room', 'create');
    expect(latest('guest', 'room:error')).toBe('Room already exists');
    guest.send('room:join', 'room');
    expect(latest<RoomState>('room', 'room:state').players).toHaveLength(2);
    host.send('game:start');
    const late = client('late');
    late.send('player:register', 'Late');
    late.send('room:join', 'room', 'join');
    expect(latest('late', 'room:error')).toBe('Game already started');
    late.send('room:join', 'legacy');
    expect(latest<RoomState>('legacy', 'room:state').hostId).toBe('late');
  });

  it('lets only the host start, then broadcasts gravity and spectra', () => {
    const { client, joinRoom, latest, emissions } = createHarness();
    client('outsider').send('game:start');
    expect(latest('outsider', 'game:error')).toBe('You are not in a room');
    const host = joinRoom('host');
    const guest = joinRoom('guest');
    guest.send('game:start');
    expect(latest('guest', 'game:error')).toBe('Only Host Allowed');
    host.send('game:start');
    const before = latest<GameState>('host', 'game:state');
    emissions.length = 0;
    vi.advanceTimersByTime(499);
    expect(emissions).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(latest<GameState>('host', 'game:state').tetromino.position[1]).toBe(before.tetromino.position[1] + 1);
    expect(emissions.some(item => item.event === 'game:spectra')).toBe(true);
    host.send('game:start');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('routes actions, finishes, and lets the host restart without guest confirmation', () => {
    const { joinRoom, latest } = createHarness();
    const host = joinRoom('host');
    const guest = joinRoom('guest');
    host.send('game:start');
    const guestBefore = latest<GameState>('guest', 'game:state');
    const hostBefore = latest<GameState>('host', 'game:state');
    host.send('game:action', 'MOVE_LEFT');
    expect(latest<GameState>('host', 'game:state').tetromino.position[0]).toBe(hostBefore.tetromino.position[0] - 1);
    expect(latest<GameState>('guest', 'game:state')).toEqual(guestBefore);
    host.send('game:action', 'INVALID');
    expect(latest('host', 'game:error')).toBe('Invalid game action');
    host.send('game:restart');
    expect(latest('host', 'game:error')).toBe('Game is not finished');
    for (let i = 0; i < 50 && !latest<GameState>('guest', 'game:state').gameOver; i++) {
      guest.send('game:action', 'HARD_DROP');
    }
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'FINISHED', winnerId: 'host' });
    expect(vi.getTimerCount()).toBe(0);
    guest.send('game:restart');
    expect(latest('guest', 'game:error')).toBe('Only host can restart');
    expect(vi.getTimerCount()).toBe(0);
    host.send('game:restart');
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'PLAYING', winnerId: null });
    expect(latest<GameState>('guest', 'game:state').gameOver).toBe(false);
    expect(vi.getTimerCount()).toBe(1);
  });

  it.each(['host', 'guest'])('does not automatically restart when %s leaves, but the one left can restart alone', leaver => {
    const { joinRoom, latest } = createHarness();
    const host = joinRoom('host');
    const guest = joinRoom('guest');
    host.send('game:start');
    (leaver === 'host' ? host : guest).send('disconnect');
    const remainingId = leaver === 'host' ? 'guest' : 'host';
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({
      status: 'FINISHED', winnerId: remainingId, hostId: remainingId,
    });
    expect(vi.getTimerCount()).toBe(0);
    const remaining = leaver === 'host' ? guest : host;
    remaining.send('game:restart');
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'PLAYING', hostId: remainingId });
    expect(vi.getTimerCount()).toBe(1);
    remaining.send('disconnect');
    expect(vi.getTimerCount()).toBe(0);
    joinRoom('new');
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'WAITING', hostId: 'new' });
  });

  it('plays a one-player room from the URL through gravity, game over, restart, and cleanup', () => {
    const { joinRoom, latest } = createHarness();
    const alone = joinRoom('alone');
    alone.send('game:start');
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'PLAYING', hostId: 'alone' });
    for (let i = 0; i < 1000 && latest<RoomState>('room', 'room:state').status === 'PLAYING'; i++) {
      vi.advanceTimersByTime(500);
    }
    expect(latest<RoomState>('room', 'room:state')).toMatchObject({ status: 'FINISHED', winnerId: null });
    expect(vi.getTimerCount()).toBe(0);
    joinRoom('late');
    expect(latest<RoomState>('room', 'room:state').players).toHaveLength(2);
    alone.send('game:restart');
    expect(latest<RoomState>('room', 'room:state').status).toBe('PLAYING');
    expect(latest<GameState>('alone', 'game:state').lines).toBe(0);
    expect(latest<GameState>('late', 'game:state').gameOver).toBe(false);
  });

  it('lets only the host toggle hard mode in the lobby and broadcasts it', () => {
    const { client, joinRoom, latest } = createHarness();
    client('outsider').send('room:hardMode', true);
    expect(latest('outsider', 'game:error')).toBe('You are not in a room');
    const host = joinRoom('host');
    const guest = joinRoom('guest');
    expect(latest<RoomState>('room', 'room:state').hardMode).toBe(false);

    guest.send('room:hardMode', true);
    expect(latest('guest', 'game:error')).toBeDefined();
    expect(latest<RoomState>('room', 'room:state').hardMode).toBe(false);

    for (const invalid of ['true', 1, null, undefined]) {
      host.send('room:hardMode', invalid);
      expect(latest('host', 'game:error')).toBe('Invalid hard mode value');
    }
    expect(latest<RoomState>('room', 'room:state').hardMode).toBe(false);

    host.send('room:hardMode', true);
    expect(latest<RoomState>('room', 'room:state').hardMode).toBe(true);
    host.send('room:hardMode', false);
    expect(latest<RoomState>('room', 'room:state').hardMode).toBe(false);

    host.send('game:start');
    const before = latest<RoomState>('room', 'room:state');
    host.send('room:hardMode', true);
    expect(latest('host', 'game:error')).toBeDefined();
    expect(latest<RoomState>('room', 'room:state')).toEqual(before);
  });

  it.each([
    { hardMode: false, tickMs: NORMAL_TICK_MS },
    { hardMode: true, tickMs: HARD_TICK_MS },
  ])('applies gravity every $tickMs ms when hard mode is $hardMode', ({ hardMode, tickMs }) => {
    const { joinRoom, latest, emissions } = createHarness();
    const host = joinRoom('host');
    host.send('room:hardMode', hardMode);
    host.send('game:start');
    const before = latest<GameState>('host', 'game:state');
    emissions.length = 0;
    vi.advanceTimersByTime(tickMs - 1);
    expect(emissions).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(latest<GameState>('host', 'game:state').tetromino.position[1]).toBe(before.tetromino.position[1] + 1);
  });

  it('keeps rooms and server instances isolated', () => {
    const first = createHarness();
    const second = createHarness();
    first.joinRoom('host');
    const other = second.client('host');
    other.send('room:join', 'room');
    expect(second.latest('host', 'room:error')).toBe('user should be registered first');
    const otherRoom = first.client('solo');
    otherRoom.send('player:register', 'Solo');
    otherRoom.send('room:join', 'elsewhere');
    otherRoom.send('game:start');
    vi.advanceTimersByTime(500);
    expect(first.latest<RoomState>('room', 'room:state').status).toBe('WAITING');
    expect(first.emissions.some(item => item.target === 'host' && item.event === 'game:state')).toBe(false);
  });
});
