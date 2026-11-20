import { describe, it, expect } from 'vitest';
import { createBoard } from '../board';
import { EMPTY, FILLED } from '../consts';

describe('createBoard', () => {
  it('creates a board with 20 rows', () => {
    const board = createBoard();

    expect(board).toHaveLength(20);
  });

  it('creates rows with 10 columns', () => {
    const board = createBoard();

    for (const row of board) {
      expect(row).toHaveLength(10);
    }
  });

  it('creates an empty board', () => {
    const board = createBoard();

    for (const row of board) {
      expect(row.every(cell => cell === EMPTY)).toBe(true);
    }
  });

  it('creates independent rows and boards', () => {
    const first = createBoard();
    const second = createBoard();
    first[0]![0] = FILLED;
    expect(first[1]![0]).toBe(EMPTY);
    expect(second.flat()).toEqual(Array(200).fill(EMPTY));
    expect(new Set(first).size).toBe(20);
  });
});
