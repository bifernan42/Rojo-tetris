
import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { FILLED } from '../consts';
import { getSpectrum } from '../spectrum';

describe('getSpectrum', () => {
  it('returns 10 zero heights for an empty board', () => {
    const board = createBoard();

    expect(getSpectrum(board)).toEqual(
      Array(10).fill(0)
    );
  });

  it('returns the highest occupied cell in each column', () => {
    const board = createBoard();

    board[19]![0] = FILLED;
    board[17]![0] = FILLED;
    board[18]![3] = FILLED;

    expect(getSpectrum(board)).toEqual([
      3, 0, 0, 2, 0, 0, 0, 0, 0, 0
    ]);
  });

  it('does not modify the original board', () => {
    const board = createBoard();
    board[19]![5] = FILLED;

    const original = board.map(row => [...row]);

    getSpectrum(board);

    expect(board).toEqual(original);
  });
});
