import { describe, it, expect } from 'vitest';
import { PieceSequence } from '../PieceSequence';

describe('PieceSequence', () => {
  it('contains all 7 pieces in each bag', () => {
    const sequence = new PieceSequence();

    const firstBag = Array.from(
      { length: 7 },
      (_, i) => sequence.at(i)
    );

    expect(new Set(firstBag).size).toBe(7);
    expect([...firstBag].sort()).toEqual(
      ['I', 'O', 'T', 'L', 'J', 'S', 'Z'].sort()
    );
  });

  it('generates another complete bag', () => {
    const sequence = new PieceSequence();

    const secondBag = Array.from(
      { length: 7 },
      (_, i) => sequence.at(i + 7)
    );

    expect(new Set(secondBag).size).toBe(7);
  });

  it('returns the same kind for the same index', () => {
    const sequence = new PieceSequence();

    expect(sequence.at(5)).toBe(sequence.at(5));
    expect(sequence.at(12)).toBe(sequence.at(12));
  });

  // can be refactored to prove it works for all pieces
  it('never has more than 12 other Tetriminos between two Ls', () => {
    const sequence = new PieceSequence();

    const indexes = Array.from(
      { length: 140 },
      (_, i) => i
    ).filter(i => sequence.at(i) === 'L');

    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]! - indexes[i - 1]!).toBeLessThanOrEqual(13);
    }
  });

  it('rejects negative or non-integer indexes', () => {
    const sequence = new PieceSequence();

    expect(() => sequence.at(-1)).toThrow();
    expect(() => sequence.at(1.5)).toThrow();
  });
});
