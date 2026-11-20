import { EMPTY, BOARD_COLS, BOARD_ROWS } from "./consts";

/**
 *  # Board
 * the type used to represent the tetris board, it's a number `matrix` (array of array of numbers)
 */
export type Board = number[][];

/**
 * Create an empty board with independent row arrays.
 */
export function createBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array(BOARD_COLS).fill(EMPTY),
  );
}
