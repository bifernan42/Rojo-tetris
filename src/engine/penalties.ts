import type { Board } from "./board";
import { EMPTY, INDESTRUCTIBLE } from "./consts";

/**
 * # injectPenaltyLines
 *
 * *Pure* function that shifts existing rows upward and adds indestructible
 * rows at the bottom, preserving the supplied board's dimensions.
 * Overflow means occupied cells were pushed off the top, or the requested
 * count exceeds the board height. The returned board may share unchanged
 * rows with the input; this function does not mutate them.
 *
 * @param board Current board
 * @param count Nonnegative integer number of penalty rows
 * @returns The resulting board and whether overflow occurred
 * @throws If count is negative or is not an integer
 */
export function injectPenaltyLines(
  board: Board,
  count: number,
): { board: Board; overflow: boolean } {
  // Board is number[][], so its type does not enforce the standard dimensions.
  // Read the input dimensions; BOARD_ROWS/COLS only set createBoard's defaults.
  const height = board.length;
  const width = board[0]?.length ?? 0;

  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Invalid penalty count");
  }

  if (count === 0) {
    return {
      board: board.map((row) => [...row]),
      overflow: false,
    };
  }

  const overflow =
    count > height ||
    board.slice(0, count).some((row) => row.some((cell) => cell !== EMPTY));

  const remaining = board.slice(count);

  const penalties = Array.from({ length: Math.min(count, height) }, () =>
    Array(width).fill(INDESTRUCTIBLE),
  );

  return {
    board: [...remaining, ...penalties],
    overflow,
  };
}
