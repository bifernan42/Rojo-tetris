import { describe, it, expect } from "vitest";
import { Room } from '../Room'
import { Player } from "../Player";
describe('Room', () => {

  it('creates an empty room', () => {
    const firstRoom: Room = new Room('cozy room');
    expect(firstRoom.name).toBe('cozy room');
    expect(firstRoom.players.size).toBe(0);
    expect(firstRoom.hostId).toBeNull();
  });

  it('makes the first player the Host', () => {
    const emptyRoom: Room = new Room('room');
    const p1: Player = new Player('id', 'p1');
    emptyRoom.addPlayer(p1);
    expect(emptyRoom.hostId).toBe(p1.id);
    expect(emptyRoom.players.size).toBe(1);
    expect(emptyRoom.players.get(p1.id)).toBe(p1);
  });

  it('transfers the ownership when the host leaves', () => {
    const emptyRoom: Room = new Room('room');
    const p1: Player = new Player('id1', 'p1');
    const p2: Player = new Player('id2', 'p2');

    expect(emptyRoom.hostId).toBeNull();
    emptyRoom.addPlayer(p1);
    emptyRoom.addPlayer(p2);
    expect(emptyRoom.hostId).toBe(p1.id);
    expect(emptyRoom.players.size).toBe(2);
    emptyRoom.removePlayer(p1.id);
    expect(emptyRoom.hostId).toBe(p2.id);
    expect(emptyRoom.players.size).toBe(1);
    emptyRoom.removePlayer(p2.id);
    expect(emptyRoom.hostId).toBeNull();
    expect(emptyRoom.players.size).toBe(0);
    
  });
  
  it('starts in WAITING state', () => {
    const testRoom = new Room('test');
  
    expect(testRoom.status).toBe('WAITING');
  });
  
  it('allows the host to start the game', () => {
    const playRoom = new Room('test');
    const p1 = new Player('id1', 'p1');
  
    playRoom.addPlayer(p1);
    playRoom.addPlayer(new Player('id2', 'p2'));
    playRoom.start(p1.id);
  
    expect(playRoom.status).toBe('PLAYING');
  });
  
  it('does not allow another player to start', () => {
    const adversarialRoom = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    adversarialRoom.addPlayer(p1);
    adversarialRoom.addPlayer(p2);
  
    expect(() => adversarialRoom.start(p2.id)).toThrow();
    expect(adversarialRoom.status).toBe('WAITING');
  });
  
  it('does not allow joining during a game', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(new Player('id3', 'p3'));
    room.start(p1.id);
  
    expect(() => room.addPlayer(p2)).toThrow();
  });
  
  it('does not start if empty', () => {
    const room = new Room('test');
  
    expect(() => room.start('id1')).toThrow();
  });

  
  it('finishes multiplayer when only one player survives', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    // Simulate p1 losing
    const state = room.game!.getState(p1.id)!;
    room.game!.states.set(p1.id, {
      ...state,
      gameOver: true,
    });
  
    const finished = room.finishIfOver();
  
    expect(finished).toBe(true);
    expect(room.status).toBe('FINISHED');
    expect(room.winnerId).toBe(p2.id);
  });
  
  it('does not finish while both players are alive', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    expect(room.finishIfOver()).toBe(false);
    expect(room.status).toBe('PLAYING');
  });
  
  it('does not immediately finish a one-player game', () => {
    const room = new Room('solo');
    const p1 = new Player('id1', 'p1');
  
    room.addPlayer(p1);
    room.start(p1.id);
  
    expect(room.finishIfOver()).toBe(false);
    expect(room.status).toBe('PLAYING');
  });
  
  it('finishes a one-player game when the player loses', () => {
    const room = new Room('solo');
    const p1 = new Player('id1', 'p1');
  
    room.addPlayer(p1);
    room.start(p1.id);
  
    const state = room.game!.getState(p1.id)!;
  
    room.game!.states.set(p1.id, {
      ...state,
      gameOver: true,
    });
  
    expect(room.finishIfOver()).toBe(true);
    expect(room.status).toBe('FINISHED');
    expect(room.winnerId).toBeNull();
  });
  
  it('handles simultaneous elimination', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    for (const player of [p1, p2]) {
      const state = room.game!.getState(player.id)!;
  
      room.game!.states.set(player.id, {
        ...state,
        gameOver: true,
      });
    }
  
    expect(room.finishIfOver()).toBe(true);
    expect(room.winnerId).toBeNull();
  });

  
  it('allows the host to restart a finished game without guest confirmation', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    const previousGame = room.game;
  
    // Simulate p1 losing
    const state = room.game!.getState(p1.id)!;
    room.game!.states.set(p1.id, {
      ...state,
      gameOver: true,
    });
  
    room.finishIfOver();
    room.restart(p1.id);
  
    expect(room.status).toBe('PLAYING');
    expect(room.winnerId).toBeNull();
    expect(room.game).not.toBe(previousGame);
    expect(room.game?.getState(p1.id)?.gameOver).toBe(false);
    expect(room.game?.getState(p2.id)?.gameOver).toBe(false);
  });
  
  it('rejects restart from a non-host', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    const state = room.game!.getState(p1.id)!;
    room.game!.states.set(p1.id, {
      ...state,
      gameOver: true,
    });
    room.finishIfOver();
  
    expect(() => room.restart(p2.id)).toThrow();
    expect(room.status).toBe('FINISHED');
  });
  
  it('rejects restart while a game is still running', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    room.addPlayer(p1);
    room.addPlayer(new Player('id2', 'p2'));
    room.start(p1.id);

    expect(() => room.restart(p1.id)).toThrow('Game is not finished');
  });

  
  it('transfers host when the host disconnects', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
  
    room.disconnectPlayer(p1.id);
  
    expect(room.hostId).toBe(p2.id);
    expect(room.players.has(p1.id)).toBe(false);
  });
  
  it('declares a winner when a player disconnects', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    room.disconnectPlayer(p2.id);
  
    expect(room.status).toBe('FINISHED');
    expect(room.winnerId).toBe(p1.id);
  });
  
  it('handles host disconnection during a match', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.start(p1.id);
  
    room.disconnectPlayer(p1.id);
  
    expect(room.hostId).toBe(p2.id);
    expect(room.winnerId).toBe(p2.id);
    expect(room.status).toBe('FINISHED');
  });
  
  it('does not finish a three-player match after one disconnect', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
    const p3 = new Player('id3', 'p3');
  
    room.addPlayer(p1);
    room.addPlayer(p2);
    room.addPlayer(p3);
    room.start(p1.id);
  
    room.disconnectPlayer(p3.id);
  
    expect(room.status).toBe('PLAYING');
    expect(room.players.size).toBe(2);
  });
  
  it('removes the final player', () => {
    const room = new Room('test');
    const p1 = new Player('id1', 'p1');
  
    room.addPlayer(p1);
    room.disconnectPlayer(p1.id);
  
    expect(room.players.size).toBe(0);
    expect(room.hostId).toBeNull();
  });
  it('lets the host start alone, and lets others join once that game is over', () => {
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Guest');
    const room = new Room('room');
    room.addPlayer(host);
    room.start(host.id);
    expect(room.status).toBe('PLAYING');
    expect(() => room.addPlayer(guest)).toThrow('Game already started');
    const state = room.game!.getState(host.id)!;
    room.game!.states.set(host.id, { ...state, gameOver: true });
    expect(room.finishIfOver()).toBe(true);
    room.addPlayer(guest);
    expect(room.players.size).toBe(2);
  });

  it('lets the remaining host restart alone after the opponent left', () => {
    const room = new Room('room');
    const host = new Player('host', 'Host');
    const guest = new Player('guest', 'Guest');
    room.addPlayer(host);
    room.addPlayer(guest);
    room.start(host.id);
    room.disconnectPlayer(guest.id);
    expect(room.status).toBe('FINISHED');
    expect(() => room.restart('guest')).toThrow('Only host');
    room.restart(host.id);
    expect(room.status).toBe('PLAYING');
    expect(room.game!.states.size).toBe(1);
  });

  describe('hard mode', () => {
    function lobby() {
      const room = new Room('room');
      room.addPlayer(new Player('host', 'Host'));
      room.addPlayer(new Player('guest', 'Guest'));
      return room;
    }

    it('is off by default', () => {
      expect(new Room('room').hardMode).toBe(false);
    });

    it('lets the host turn it on and back off', () => {
      const room = lobby();
      room.setHardMode('host', true);
      expect(room.hardMode).toBe(true);
      room.setHardMode('host', false);
      expect(room.hardMode).toBe(false);
    });

    it('refuses a player who is not the host', () => {
      const room = lobby();
      expect(() => room.setHardMode('guest', true)).toThrow();
      expect(room.hardMode).toBe(false);
    });

    it('refuses a change during a game, but allows it once the game is finished', () => {
      const room = lobby();
      room.start('host');
      expect(() => room.setHardMode('host', true)).toThrow();
      expect(room.hardMode).toBe(false);
      room.status = 'FINISHED';
      room.setHardMode('host', true);
      expect(room.hardMode).toBe(true);
    });

    it('keeps the setting across a restart', () => {
      const room = lobby();
      room.setHardMode('host', true);
      room.start('host');
      room.status = 'FINISHED';
      room.restart('host');
      expect(room.hardMode).toBe(true);
    });
  });
});
