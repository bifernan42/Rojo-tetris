/**
 * # Point
 *
 * Simple data structure representing a 2D point (x, y)
 * Note that the Y-axis is inverted (points down) so
 * (0, 0) corresponds to the top left cell of the grid
 */
export type Point = readonly [number, number];

/**
 * # Tetromino
 *
 * The tetromino data structure, used to represent all
 * tetromino types found in the original tetris :
 * I, O, T, L, J, S, Z
 *
 * ## attributes :
 * - kind : the shape letter, preserved through movement and rotation
 * - cells : an array of 4 `Point` defining the tetromino shape
 * - pivot : a special point used as the rotation origin (pivot point)
 * - position : current tetromino position, can be seen as the position vector
 * of the tetromino object
 *
 * Each board coordinate is the sum of a local cell coordinate and position.
 *
 * *conceptually* :
 *  cells : [[0, 0], [0, 1], [0, 2], [0, 3]]
 *  position :  [0, 10] (10 rows down)
 * translated cells : [[0,10], [0, 11], [0, 12], [0, 13]]
 *
 */
export type Tetromino = {
  kind: TetrominoKind;
  cells: readonly Point[];
  pivot: Point;
  position: Point;
};

/**
 * # TETROMINO_KINDS
 * A helper constant to construct the TetrominoKind
 * The seven original tetrominos shapes described with letters
 * [source here](https://fr.wikipedia.org/wiki/T%C3%A9tromino)
 */
export const TETROMINO_KINDS = ["I", "O", "T", "L", "J", "Z", "S"] as const;

/**
 * # TetrominoKind
 *
 * Union of the seven shape letters, derived from the runtime list above.
 * TypeScript's typeof type query refers to a value identifier, not an inline
 * array literal. Keeping the list also lets the server build its shuffled bag
 * and the tests enumerate every shape from the same source.
 */
export type TetrominoKind = (typeof TETROMINO_KINDS)[number];

/**
 * # TETROMINO_SHAPES
 *
 * Local cells and rotation pivot of each shape, at position (0, 0).
 * O has a fractional pivot because it spans an even number of cells (2 by 2).
 */
const TETROMINO_SHAPES: Record<TetrominoKind, Pick<Tetromino, "cells" | "pivot">> = {
  I: { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], pivot: [2, 0] },
  O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], pivot: [0.5, 0.5] },
  T: { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], pivot: [1, 1] },
  L: { cells: [[0, 0], [1, 0], [2, 0], [0, 1]], pivot: [1, 0] },
  J: { cells: [[1, 0], [1, 1], [0, 2], [1, 2]], pivot: [1, 1] },
  Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], pivot: [1, 1] },
  S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], pivot: [1, 1] },
};

/**
 * # createTetromino
 * Pure tetromino factory: a new tetromino of the requested kind at position (0, 0)
 * @param kind The shape letter (TetrominoKind)
 * @returns A new tetromino of the requested kind
 */
export function createTetromino(kind: TetrominoKind): Tetromino {
  const { cells, pivot } = TETROMINO_SHAPES[kind];
  // Fresh arrays: no tetromino ever shares data with the table or another piece.
  return {
    kind,
    cells: cells.map(([x, y]) => [x, y] as const),
    pivot: [pivot[0], pivot[1]],
    position: [0, 0],
  };
}
