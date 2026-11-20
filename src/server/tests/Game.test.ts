import { describe, it, expect } from 'vitest';
import { Game } from '../Game';
import { Player } from '../Player';
import { move } from '../../engine/game';
import { createBoard } from '../../engine/board';
import { createTetromino } from '../../engine/tetrominoes';
import { rotateRight, translate } from '../../engine/transformations';
import { INDESTRUCTIBLE } from '../../engine/consts';

describe('Game', () => {
  it('creates independent game states for players', () => {
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');

    const game = new Game([p1, p2]);

    const p1State = game.getState(p1.id);
    const p2State = game.getState(p2.id);

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();

    expect(p1State).not.toBe(p2State);
    expect(p1State?.board).not.toBe(p2State?.board);
  });

  it('moves only the requested player', () => {
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    const game = new Game([p1, p2]);
  
    const p1Before = game.getState(p1.id)!;
    const p2Before = game.getState(p2.id)!;
  
    game.applyPlayerMove(p1.id, 'MOVE_LEFT');
  
    const p1After = game.getState(p1.id)!;
    const p2After = game.getState(p2.id)!;
  
    expect(p1After).toEqual(
      move(p1Before, -1, 0)
    );
  
    expect(p2After).toBe(p2Before);
  });

  it('distributes the same initial piece', () => {
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    const game = new Game([p1, p2]);
  
    expect(game.getState(p1.id)?.tetromino).toEqual(
      game.getState(p2.id)?.tetromino
    );
  });

  it('does not advance p2 when p1 hard drops', () => {
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    const game = new Game([p1, p2]);
  
    const p2Before = game.getState(p2.id);
  
    game.applyPlayerMove(p1.id, 'HARD_DROP');
  
    expect(game.getState(p2.id)).toBe(p2Before);
  });

  it('applies gravity to every active player', () => {
    const p1 = new Player('id1', 'p1');
    const p2 = new Player('id2', 'p2');
  
    const game = new Game([p1, p2]);
  
    const y1 = game.getState(p1.id)!.tetromino.position[1];
    const y2 = game.getState(p2.id)!.tetromino.position[1];
  
    game.advanceAllPlayersOneStep();
  
    expect(
      game.getState(p1.id)!.tetromino.position[1]
    ).toBe(y1 + 1);
  
    expect(
      game.getState(p2.id)!.tetromino.position[1]
    ).toBe(y2 + 1);
  });
});

describe('penalty delivery and piece sequence', () => {
  it.each([1, 2, 3, 4])('clearing %i rows injects n − 1 rows into an opponent immediately', count => {
    const game = new Game([new Player('p1', 'P1'), new Player('p2', 'P2')]);
    const state = game.getState('p1')!;
    for (let y = 20 - count; y < 20; y++) {
      state.board[y] = Array(10).fill(1);
      state.board[y]![4] = 0;
    }
    // Turn the I upright so it fills the gap in column 4, rows 16–19.
    game.states.set('p1', { ...state, tetromino: translate(rotateRight(createTetromino("I")), 2, 18) });
    const before = game.getState('p2')!;
    game.applyPlayerMove('p1', 'HARD_DROP');
    const after = game.getState('p2')!;
    expect(game.getState('p1')!.lines).toBe(count);
    const solidRows = after.board.filter(row => row.every(cell => cell === INDESTRUCTIBLE)).length;
    expect(solidRows).toBe(count - 1);
    expect(after.tetromino.position[1]).toBe(before.tetromino.position[1] - (count - 1));
    expect(after.gameOver).toBe(false);
  });

  it('applies simultaneous attacks only after every player completes the tick', () => {
    const game = new Game([new Player('p1', 'P1'), new Player('p2', 'P2')]);
    for (const [id, state] of game.states) {
      for (const y of [18, 19]) {
        state.board[y] = Array(10).fill(1);
        state.board[y]![4] = 0;
        state.board[y]![5] = 0;
      }
      game.states.set(id, { ...state, tetromino: translate(createTetromino("O"), 4, 18) });
    }
    game.advanceAllPlayersOneStep();
    for (const state of game.states.values()) {
      expect(state.lines).toBe(2);
      expect(state.board[19]!.every(cell => cell === INDESTRUCTIBLE)).toBe(true);
      expect(state.board.slice(0, 19).flat().every(cell => cell === 0)).toBe(true);
    }
  });

  it('delivers matching pieces and spawn coordinates at different player speeds', () => {
    const game = new Game([new Player('p1', 'P1'), new Player('p2', 'P2')]);
    const pieces = [game.getState('p1')!.tetromino];
    for (let i = 0; i < 14; i++) {
      game.states.set('p1', { ...game.getState('p1')!, board: createBoard() });
      game.applyPlayerMove('p1', 'HARD_DROP');
      pieces.push(game.getState('p1')!.tetromino);
    }
    expect(game.getState('p2')!.tetromino).toEqual(pieces[0]);
    for (let i = 1; i < pieces.length; i++) {
      game.states.set('p2', { ...game.getState('p2')!, board: createBoard() });
      game.applyPlayerMove('p2', 'HARD_DROP');
      expect(game.getState('p2')!.tetromino).toEqual(pieces[i]);
    }
  });
});
