import { describe, it, expect } from "vitest";
import { createBoard } from "../board";
import { injectPenaltyLines } from "../penalties";
import { FILLED, INDESTRUCTIBLE } from "../consts";

describe("injectPenaltyLines", () => {
  it("adds 2 indestructible rows at the bottom", () => {
    const board = createBoard();

    const result = injectPenaltyLines(board, 2);

    expect(result.board[18]).toEqual(Array(10).fill(INDESTRUCTIBLE));
    expect(result.board[19]).toEqual(Array(10).fill(INDESTRUCTIBLE));
    expect(result.overflow).toBe(false);
  });

  it("pushes existing blocks upward", () => {
    const board = createBoard();
    board[19]![4] = FILLED;

    const result = injectPenaltyLines(board, 2);

    expect(result.board[17]![4]).toBe(FILLED);
    expect(result.board[19]![4]).toBe(INDESTRUCTIBLE);
  });

  it("detects overflow", () => {
    const board = createBoard();
    board[0]![0] = FILLED;

    const result = injectPenaltyLines(board, 1);

    expect(result.overflow).toBe(true);
  });

  it("does not mutate the original board", () => {
    const board = createBoard();
    const original = board.map((row) => [...row]);

    injectPenaltyLines(board, 2);

    expect(board).toEqual(original);
  });

  it("does nothing when count is zero", () => {
    const board = createBoard();

    const result = injectPenaltyLines(board, 0);

    expect(result.board).toEqual(board);
    expect(result.overflow).toBe(false);
  });
});
