import type { Board } from "./board";
import { EMPTY } from "./consts";

/**
 * # getSpectrum
 *
 * *Pure* function that returns the skyline of the settled board: one height
 * per column, measured from the bottom to its highest nonempty cell.
 * Penalty cells count too; holes below the highest cell do not reduce its
 * height. Empty columns return 0. The active piece is not part of the board.
 *
 * @param board Board whose column heights are read
 * @returns Column heights, from left to right
 */
export function getSpectrum(board: Board): number[] {
  const height = board.length;
  const width = board[0]?.length ?? 0;

  return Array.from({ length: width }, (_, x) => {
    for (let y = 0; y < height; y++) {
      if (board[y]![x] !== EMPTY) {
        return height - y;
      }
    }

    return 0;
  });
}
