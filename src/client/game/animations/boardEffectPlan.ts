import type { BoardEffect, GameState } from "../../../engine/game";
import { EMPTY } from "../../../engine/consts";

/** CSS class applied to every non-empty cell of a row, with an optional start offset in px. */
export type CellEffect = Readonly<{ className: string; from?: number }>;

/** One presentation frame of a board effect: what to show, how to animate it, for how long. */
export type EffectStep = Readonly<{
  snapshot: GameState;
  rowEffects: readonly (CellEffect | null)[];
  beams: readonly number[];
  durationMs: number;
}>;

export const CLEAR_MS = 1100;
export const DROP_MS = 250;
export const RAISE_MS = 800;

/**
 * Turn a board effect into a sequence of declarative steps (clear, drop, raise).
 * Pure: no DOM, no timers. The active piece stays hidden (gameOver) while replaying.
 */
export function planBoardEffect(game: GameState, event: BoardEffect, cellSize = 24): EffectStep[] {
  const steps: EffectStep[] = [];
  const height = event.lockedBoard.length;

  if (event.clearedRows.length) {
    const cleared = new Set(event.clearedRows);
    steps.push({
      snapshot: { ...game, board: event.lockedBoard, blockKinds: event.lockedKinds, gameOver: true },
      rowEffects: event.lockedBoard.map((_, y) => (cleared.has(y) ? { className: "cell--clearing" } : null)),
      beams: [...event.clearedRows],
      durationMs: CLEAR_MS,
    });

    const survivors = event.lockedBoard.map((_, y) => y).filter((y) => !cleared.has(y));
    const emptyRows = event.clearedRows.map(() => event.lockedBoard[0]!.map(() => EMPTY));
    const rowEffects: (CellEffect | null)[] = Array.from({ length: height }, () => null);
    survivors.forEach((oldY, index) => {
      const newY = index + event.clearedRows.length;
      if (newY !== oldY) rowEffects[newY] = { className: "cell--dropping", from: -(newY - oldY) * cellSize };
    });
    steps.push({
      snapshot: {
        ...game,
        gameOver: true,
        board: [...emptyRows, ...survivors.map((y) => event.lockedBoard[y]!)],
        blockKinds: [
          ...emptyRows.map((r) => r.map(() => null)),
          ...survivors.map((y) => event.lockedKinds[y]!),
        ],
      },
      rowEffects,
      beams: [],
      durationMs: DROP_MS,
    });
  }

  if (event.insertedRows) {
    steps.push({
      snapshot: { ...game, gameOver: true },
      rowEffects: game.board.map(() => ({ className: "cell--raising", from: event.insertedRows * cellSize })),
      beams: [],
      durationMs: RAISE_MS,
    });
  }

  return steps;
}
