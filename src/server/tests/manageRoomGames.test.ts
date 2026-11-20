import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'socket.io';
import type { ScoreEntry } from '../../common/protocol';
import { RoomGameManager } from '../RoomGameManager';
import { Room } from '../Room';
import { Player } from '../Player';

describe('room runtime', () => {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const saveScore = vi.fn<(entry: ScoreEntry) => void>();
  let runtime: RoomGameManager;
  let room: Room;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    runtime = new RoomGameManager({ to } as unknown as Server, saveScore);
    room = new Room('friends');
    room.addPlayer(new Player('alice', 'Alice'));
    room.start('alice');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('sends the board to the player and spectra to the room channel', () => {
    room.game!.getState('alice')!.lines = 2;
    vi.setSystemTime(2500);

    runtime.broadcastGame(room);

    expect(to.mock.calls).toEqual([['alice'], ['room:friends']]);
    expect(emit).toHaveBeenNthCalledWith(1, 'game:state', expect.objectContaining({
      score: 200,
      elapsedMs: 1500,
      nextTetromino: room.game!.getNextPiece('alice'),
    }));
    expect(emit).toHaveBeenNthCalledWith(2, 'game:spectra', [
      { playerId: 'alice', name: 'Alice', heights: Array(10).fill(0) },
    ]);
  });

  it('saves earned points only when the score increases', () => {
    runtime.broadcastGame(room);
    expect(saveScore).not.toHaveBeenCalled();

    room.game!.getState('alice')!.lines = 2;
    runtime.broadcastGame(room);
    runtime.broadcastGame(room);
    expect(saveScore).toHaveBeenCalledExactlyOnceWith({ name: 'Alice', score: 200 });

    room.game!.getState('alice')!.lines = 3;
    runtime.broadcastGame(room);
    expect(saveScore).toHaveBeenCalledTimes(2);
    expect(saveScore).toHaveBeenLastCalledWith({ name: 'Alice', score: 300 });
  });

  it('still sends the board when saving fails, and retries next time', () => {
    const error = new Error('Database unavailable');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    saveScore.mockImplementationOnce(() => { throw error; });
    room.game!.getState('alice')!.lines = 1;

    runtime.broadcastGame(room);
    expect(emit).toHaveBeenCalledWith('game:state', expect.objectContaining({ score: 100 }));
    expect(log).toHaveBeenCalledWith('Cannot save score:', error);

    runtime.broadcastGame(room);
    expect(saveScore).toHaveBeenCalledTimes(2);
    expect(saveScore).toHaveBeenLastCalledWith({ name: 'Alice', score: 100 });
  });

  it('freezes the elapsed time and hides the next piece after game over', () => {
    vi.setSystemTime(4000);
    room.game!.eliminate('alice', 'disconnected');
    runtime.finishRoomGameIfOver(room);
    vi.setSystemTime(9000);

    runtime.broadcastGame(room);

    expect(room.status).toBe('FINISHED');
    expect(emit).toHaveBeenCalledWith('game:state', expect.objectContaining({
      gameOver: true, elapsedMs: 3000, nextTetromino: null,
    }));
  });

  it('saves scores again after restarting the game', () => {
    room.game!.getState('alice')!.lines = 3;
    runtime.broadcastGame(room);
    room.game!.eliminate('alice', 'disconnected');
    runtime.finishRoomGameIfOver(room);
    room.restart('alice');
    room.game!.getState('alice')!.lines = 1;

    runtime.broadcastGame(room);

    expect(saveScore).toHaveBeenCalledTimes(2);
    expect(saveScore).toHaveBeenLastCalledWith({ name: 'Alice', score: 100 });
  });

  it('stops sending gravity updates after the timer is stopped', () => {
    runtime.sendInitialStatesAndStartTimer(room);
    runtime.stopGameTimer(room);
    emit.mockClear();

    vi.advanceTimersByTime(1000);

    expect(emit).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
