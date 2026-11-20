import { describe, it, expect } from "vitest";
import { translate, rotateLeft, rotateRight } from "../transformations";
import { createTetromino, TETROMINO_KINDS } from "../tetrominoes";
import type { Tetromino } from "../tetrominoes";

/**
 * Freeze the input, including nested coordinates, so transformations fail
 * if they attempt to mutate it. This guards translate/rotate against future
 * regressions; it does not prove that the tetromino factories are pure.
 */
function freezeTetromino(tetromino: Tetromino): Tetromino {
  tetromino.cells.forEach(Object.freeze);
  Object.freeze(tetromino.cells);
  Object.freeze(tetromino.pivot);
  Object.freeze(tetromino.position);
  return Object.freeze(tetromino);
}

const shapes = TETROMINO_KINDS.map((kind) => ({
  name: kind,
  create: () => createTetromino(kind),
}));

describe.each(shapes)("$name transformations", ({ create }) => {
  it("can translate", () => {
    const tetromino: Tetromino = freezeTetromino(create());
    const [x, y] = tetromino.position;
    const [dx, dy] = [4, 0];
    const translated = translate(tetromino, dx, dy);
    expect(translated.position).toEqual([x + dx, y + dy]);
  });

  it("4 left rotations give back the original cell schema", () => {
    const tetromino: Tetromino = freezeTetromino(create());

    const r1 = rotateLeft(tetromino);
    const r2 = rotateLeft(r1);
    const r3 = rotateLeft(r2);
    const r4 = rotateLeft(r3);
    expect(tetromino.cells).toEqual(r4.cells);
  });

  it("4 right rotations give back the original cell schema", () => {
    const tetromino: Tetromino = freezeTetromino(create());

    const r1 = rotateRight(tetromino);
    const r2 = rotateRight(r1);
    const r3 = rotateRight(r2);
    const r4 = rotateRight(r3);
    expect(tetromino.cells).toEqual(r4.cells);
  });

  it.each([
    [4, 0],
    [-2, 0],
    [0, 3],
    [0, -1],
    [2, -3],
    [0, 0],
  ]) // pack of translations
  (
    "translates by (%i, %i) from a nonzero position without mutation",
    (dx, dy) => {
      const tetromino = freezeTetromino({ ...create(), position: [3, 5] });
      const translated = translate(tetromino, dx, dy);
      expect(translated).toEqual({ ...tetromino, position: [3 + dx, 5 + dy] });
      expect(translated).not.toBe(tetromino); // translated is a new tetromino
      expect(tetromino.position).toEqual([3, 5]); // we did not move the OG
    },
  );

  it("undoes a rotation in either direction", () => {
    const tetromino = freezeTetromino(create());
    expect(rotateLeft(rotateRight(tetromino))).toEqual(tetromino);
    expect(rotateRight(rotateLeft(tetromino))).toEqual(tetromino);
  });

  it("rotates local cells independently of the board position", () => {
    const tetromino = freezeTetromino(create());
    expect(rotateRight(translate(tetromino, 4, 7))).toEqual(
      translate(rotateRight(tetromino), 4, 7),
    );
    expect(rotateLeft(translate(tetromino, 4, 7))).toEqual(
      translate(rotateLeft(tetromino), 4, 7),
    );
  });
});

describe("rotation direction in screen coordinates", () => {
  it("rotates the L left", () => {
    const tetromino = freezeTetromino(createTetromino("L"));
    expect(rotateLeft(tetromino).cells).toEqual([
      [1, 1], [1, 0], [1, -1], [2, 1],
    ]);
  });

  it("rotates the L right", () => {
    const tetromino = freezeTetromino(createTetromino("L"));
    expect(rotateRight(tetromino).cells).toEqual([
      [1, -1], [1, 0], [1, 1], [0, -1],
    ]);
  });

  it("rotates about a pivot away from the origin", () => {
    const tetromino: Tetromino = {
      kind: "T",
      cells: [
        [2, 3],
        [3, 3],
        [4, 3],
        [3, 4],
      ],
      pivot: [3, 3],
      position: [5, 7],
    };
    expect(rotateLeft(tetromino).cells).toEqual([
      [3, 4],
      [3, 3],
      [3, 2],
      [4, 3],
    ]);
    expect(rotateRight(tetromino).cells).toEqual([
      [3, 2],
      [3, 3],
      [3, 4],
      [2, 3],
    ]);
  });

  it("rotating a 0 tetromino has no effect", () => {
    const tetromino = createTetromino("O");
    for (const rotate of [rotateLeft, rotateRight]) {
      let rotated = tetromino;
      for (let turn = 0; turn < 4; turn++) {
        rotated = rotate(rotated);
        expect(new Set(rotated.cells.map((cell) => cell.join(",")))).toEqual(
          new Set(tetromino.cells.map((cell) => cell.join(","))),
        );
      }
    }
  });
});
