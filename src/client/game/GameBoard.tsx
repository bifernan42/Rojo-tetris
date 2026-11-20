import type { CSSProperties } from "react";
import { getCellsOnBoard } from "../../engine/game";
import type { GameState } from "../../engine/game";
import { FILLED } from "../../engine/consts";
import type { CellEffect } from "./animations/boardEffectPlan";

// Mark the falling tetromino only in the display copy of the settled board.
const FALLING = 2;

type Props = {
  game: GameState;
  /** Optional per-row animation class and start offset, rendered declaratively. */
  rowEffects?: readonly (CellEffect | null)[] | undefined;
};

export default function GameBoard({ game, rowEffects }: Props) {
  const display = game.board.map((row) => [...row]);

  for (const [x, y] of game.gameOver ? [] : getCellsOnBoard(game.tetromino)) {
    if (y >= 0 && y < display.length && x >= 0 && x < display[y]!.length) {
      display[y]![x] = FALLING;
    }
  }

  return (
    <div className="board">
      {display.flatMap((row, y) => {
        const effect = rowEffects?.[y];
        const style = effect?.from === undefined ? undefined
          : ({ "--from": `${effect.from}px` } as CSSProperties);
        return row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={`cell cell-${cell}${effect ? ` ${effect.className}` : ""}`}
            style={style}
            data-kind={
              cell === FALLING ? game.tetromino.kind
                : cell === FILLED ? game.blockKinds[y]?.[x] ?? "Z"
                  : undefined
            }
          />
        ));
      })}
    </div>
  );
}
