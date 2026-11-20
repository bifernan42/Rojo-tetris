import { describe, it, expect } from 'vitest';
import { createTetromino } from '../tetrominoes';
import type { Tetromino } from '../tetrominoes';

describe('tetrominoI', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("I");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("I");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates a horizontal I tetromino', () => {
    const tetromino: Tetromino = createTetromino("I");
    expect(tetromino.cells).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("I");
    expect(tetromino.pivot).toEqual([2, 0]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("I");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("I");
    const second: Tetromino = createTetromino("I");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoO', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("O");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("O");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates an O tetromino', () => {
    const tetromino: Tetromino = createTetromino("O");
    expect(tetromino.cells).toEqual([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("O");
    expect(tetromino.pivot).toEqual([0.5, 0.5]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("O");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("O");
    const second: Tetromino = createTetromino("O");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoT', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("T");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("T");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates a T tetromino', () => {
    const tetromino: Tetromino = createTetromino("T");
    expect(tetromino.cells).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("T");
    expect(tetromino.pivot).toEqual([1, 1]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("T");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("T");
    const second: Tetromino = createTetromino("T");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoL', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("L");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("L");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates a L tetromino', () => {
    const tetromino: Tetromino = createTetromino("L");
    expect(tetromino.cells).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("L");
    expect(tetromino.pivot).toEqual([1, 0]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("L");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("L");
    const second: Tetromino = createTetromino("L");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoJ', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("J");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("J");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates a J tetromino', () => {
    const tetromino: Tetromino = createTetromino("J");
    expect(tetromino.cells).toEqual([
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("J");
    expect(tetromino.pivot).toEqual([1, 1]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("J");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("J");
    const second: Tetromino = createTetromino("J");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoZ', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("Z");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("Z");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates a Z tetromino', () => {
    const tetromino: Tetromino = createTetromino("Z");
    expect(tetromino.cells).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("Z");
    expect(tetromino.pivot).toEqual([1, 1]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("Z");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("Z");
    const second: Tetromino = createTetromino("Z");

    // verif the refs aren't same
    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

describe('tetrominoS', () => {
  it('has exactly four blocks', () => {
    const tetromino: Tetromino = createTetromino("S");

    expect(tetromino.cells).toHaveLength(4);
  });

  it('represents each block with two coordinates', () => {
    const tetromino: Tetromino = createTetromino("S");

    for (const cell of tetromino.cells) {
      expect(cell).toHaveLength(2);
    }
  });

  it('creates an S tetromino', () => {
    const tetromino: Tetromino = createTetromino("S");
    expect(tetromino.cells).toEqual([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ]);
  });

  it('has the expected pivot', () => {
    const tetromino: Tetromino = createTetromino("S");
    expect(tetromino.pivot).toEqual([1, 1]);
  });

  it('has an initial position', () => {
    const tetromino: Tetromino = createTetromino("S");
    expect(tetromino.position).toEqual([0, 0]);
  });

  it('creates independent instances', () => {
    const first: Tetromino = createTetromino("S");
    const second: Tetromino = createTetromino("S");

    expect(first).not.toBe(second);
    expect(first.cells).not.toBe(second.cells);
    first.cells.forEach((cell, index) => expect(cell).not.toBe(second.cells[index]));
    expect(first.pivot).not.toBe(second.pivot);
    expect(first.position).not.toBe(second.position);
  });
});

