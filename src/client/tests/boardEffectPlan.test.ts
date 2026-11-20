import { describe, expect, it } from "vitest";
import { planBoardEffect } from "../game/animations/boardEffectPlan";
import { createGame } from "../../engine/game";
import type { BoardEffect, GameState } from "../../engine/game";
import { EMPTY, FILLED } from "../../engine/consts";
import { createTetromino } from "../../engine/tetrominoes";

const COLS = 10;
const HEIGHT = 20;
const row = (value: number) => Array.from({ length: COLS }, () => value);

/** Empty locked board by default; tests override what they need. */
function effect(partial: Partial<BoardEffect>): BoardEffect {
  const lockedBoard = Array.from({ length: HEIGHT }, () => row(EMPTY));
  return {
    id: 1,
    clearedRows: [],
    insertedRows: 0,
    lockedBoard,
    lockedKinds: lockedBoard.map((r) => r.map(() => null)),
    ...partial,
  };
}

const game: GameState = createGame(createTetromino("O"));

describe("planBoardEffect", () => {
  it("returns no step when nothing happened", () => {
    expect(planBoardEffect(game, effect({}))).toEqual([]);
  });

  it("clears then drops a single row", () => {
    const lockedBoard = Array.from({ length: HEIGHT }, (_, y) =>
      y === 19 ? row(FILLED) : y === 18 ? [FILLED, ...row(EMPTY).slice(1)] : row(EMPTY));
    const steps = planBoardEffect(game, effect({ clearedRows: [19], lockedBoard }));

    expect(steps.map((s) => s.durationMs)).toEqual([1100, 250]);

    const [clearing, dropping] = steps;
    expect(clearing!.snapshot.board).toBe(lockedBoard);
    expect(clearing!.snapshot.gameOver).toBe(true);
    expect(clearing!.beams).toEqual([19]);
    expect(clearing!.rowEffects[19]).toEqual({ className: "cell--clearing" });
    expect(clearing!.rowEffects[18]).toBeNull();

    // Row 18 falls into row 19, from one cell above.
    expect(dropping!.snapshot.board[19]![0]).toBe(FILLED);
    expect(dropping!.snapshot.board[0]).toEqual(row(EMPTY));
    expect(dropping!.rowEffects[19]).toEqual({ className: "cell--dropping", from: -24 });
    expect(dropping!.beams).toEqual([]);
  });

  it("drops each surviving row by its own distance with nonadjacent clears", () => {
    const steps = planBoardEffect(game, effect({ clearedRows: [10, 19] }));
    const dropping = steps[1]!;
    // Rows 0-9 fall by 2, rows 11-18 fall by 1, two new empty rows on top do not move.
    expect(dropping.rowEffects[0]).toBeNull();
    expect(dropping.rowEffects[1]).toBeNull();
    expect(dropping.rowEffects[2]).toEqual({ className: "cell--dropping", from: -48 });
    expect(dropping.rowEffects[11]).toEqual({ className: "cell--dropping", from: -48 });
    expect(dropping.rowEffects[12]).toEqual({ className: "cell--dropping", from: -24 });
    expect(dropping.rowEffects[19]).toEqual({ className: "cell--dropping", from: -24 });
  });

  it("raises the whole board for penalty rows only", () => {
    const steps = planBoardEffect(game, effect({ insertedRows: 2 }));
    expect(steps).toHaveLength(1);
    expect(steps[0]!.snapshot).toEqual({ ...game, gameOver: true });
    expect(steps[0]!.durationMs).toBe(800);
    expect(steps[0]!.rowEffects).toHaveLength(HEIGHT);
    expect(steps[0]!.rowEffects.every((e) => e?.className === "cell--raising" && e.from === 48)).toBe(true);
  });

  it("chains clear, drop and raise", () => {
    const steps = planBoardEffect(game, effect({ clearedRows: [19], insertedRows: 1 }));
    expect(steps.map((s) => s.rowEffects.find(Boolean)?.className)).toEqual([
      "cell--clearing", "cell--dropping", "cell--raising",
    ]);
  });

  it("honours a custom cell size", () => {
    const steps = planBoardEffect(game, effect({ insertedRows: 1 }), 30);
    expect(steps[0]!.rowEffects[0]).toEqual({ className: "cell--raising", from: 30 });
  });
});
