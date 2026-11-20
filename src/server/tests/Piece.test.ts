import { describe, expect, it } from 'vitest';
import { Piece } from '../Piece';
import { TETROMINO_KINDS } from '../../engine/tetrominoes';

describe('Piece', () => {
  it.each(TETROMINO_KINDS)('spawns %s inside the board at the top', kind => {
    const piece = new Piece(kind).spawn();

    expect(piece.kind).toBe(kind);
    expect(piece.position[1]).toBe(0);
    expect(piece.cells).toHaveLength(4);
    for (const [x, y] of piece.cells) {
      expect(x + piece.position[0]).toBeGreaterThanOrEqual(0);
      expect(x + piece.position[0]).toBeLessThan(10);
      expect(y + piece.position[1]).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(['I', 'L'] as const)('spawns the horizontal %s at column 3', kind => {
    expect(new Piece(kind).spawn().position).toEqual([3, 0]);
  });

  it('creates independent pieces on each spawn', () => {
    const piece = new Piece('T');
    const first = piece.spawn();
    const second = piece.spawn();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    expect(first.cells[0]).not.toBe(second.cells[0]);
    expect(first.position).not.toBe(second.position);
    expect(first.pivot).not.toBe(second.pivot);
  });
});
