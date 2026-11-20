import type { Tetromino } from "./tetrominoes";

/** # translate
 *
 * *Pure* function that reads a tetromino initial state and returns a new tetromino
 * state with position displaced by `(dx, dy)`
 * @param - `tetromino`, inital tetromino state
 * - `dx` : x-axis displacement
 * - `dy` : y-axis displacement
 *
 * @returns a new tetromino at position `(x + dx, y + dy)`
 */
export function translate(
  tetromino: Tetromino,
  dx: number,
  dy: number,
): Tetromino {
  const [x, y] = tetromino.position;
  return {
    ...tetromino,
    position: [x + dx, y + dy],
  };
}

/** # rotateLeft
 *
 * Returns a new tetromino with its cells rotated 90 degrees left around its pivot.
 * The piece position stays unchanged.
 *
 * First express each cell relative to the pivot: dx = x - px, dy = y - py.
 * The rotation formula is:
 *   dx' = dx * cos(theta) - dy * sin(theta)
 *   dy' = dx * sin(theta) + dy * cos(theta)
 *
 * On the board, y increases downward, so a left turn uses theta = -PI / 2.
 * Since cos(-PI / 2) = 0 and sin(-PI / 2) = -1:
 *   dx' = dy, dy' = -dx
 * Add the pivot back: x' = px + (y - py), y' = py - (x - px).
 */
export function rotateLeft(tetromino: Tetromino): Tetromino {
  const [px, py] = tetromino.pivot;
  return {
    ...tetromino,
    cells: tetromino.cells.map(([x, y]) => {
      return [px + (y - py), py - (x - px)];
    }),
  };
}

/** # rotateRight
 *
 * Returns a new tetromino with its cells rotated 90 degrees right around its pivot.
 * The piece position stays unchanged.
 *
 * First express each cell relative to the pivot: dx = x - px, dy = y - py.
 * The rotation formula is:
 *   dx' = dx * cos(theta) - dy * sin(theta)
 *   dy' = dx * sin(theta) + dy * cos(theta)
 *
 * On the board, y increases downward, so a right turn uses theta = PI / 2.
 * Since cos(PI / 2) = 0 and sin(PI / 2) = 1:
 *   dx' = -dy, dy' = dx
 * Add the pivot back: x' = px - (y - py), y' = py + (x - px).
 */
export function rotateRight(tetromino: Tetromino): Tetromino {
  const [px, py] = tetromino.pivot;
  return {
    ...tetromino,
    cells: tetromino.cells.map(([x, y]) => {
      return [px - (y - py), py + (x - px)];
    }),
  };
}
