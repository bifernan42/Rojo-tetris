import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameState } from '../../engine/game';
import GameBoard from './GameBoard';
import { planBoardEffect } from './animations/boardEffectPlan';
import type { EffectStep } from './animations/boardEffectPlan';
import './animations/animations.css';

const CELL_SIZE = 24;

type Run = Readonly<{ id: number; steps: readonly EffectStep[]; index: number }>;

/**
 * Replay clear/penalty effects as a sequence of React renders.
 * Each step sets CSS classes on cells; CSS keyframes do the motion. No DOM API calls.
 */
export default function AnimatedGameBoard({ game }: { game: GameState }) {
  const [run, setRun] = useState<Run | null>(null);
  // Effects already present on mount (reconnect, resize) are not replayed.
  const seen = useRef(game.boardEffect?.id ?? 0);
  const event = game.boardEffect;

  // Layout effect: the first step replaces the live board before the browser paints.
  useLayoutEffect(() => {
    if (!event) {
      seen.current = 0;
      setRun(null);
      return;
    }
    if (event.id === seen.current) return;
    seen.current = event.id;
    const steps = planBoardEffect(game, event, CELL_SIZE);
    setRun(steps.length ? { id: event.id, steps, index: 0 } : null);
    // Only a new effect id starts a replay; later snapshots do not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  const step = run?.steps[run.index];

  // Advance to the next step after the current one's duration; cleanup cancels it.
  useEffect(() => {
    if (!run || !step) return;
    const timer = setTimeout(() => {
      setRun(run.index + 1 < run.steps.length ? { ...run, index: run.index + 1 } : null);
    }, step.durationMs);
    return () => clearTimeout(timer);
  }, [run, step]);

  return (
    <div className="animated-board">
      <GameBoard
        // A new key per step remounts the cells so each CSS animation restarts.
        key={run && step ? `${run.id}-${run.index}` : 'live'}
        game={step?.snapshot ?? game}
        rowEffects={step?.rowEffects}
      />
      <div className="animation-layer" aria-hidden="true">
        {step?.beams.map((row) => (
          <i key={row} className="animation-beam" style={{ top: row * CELL_SIZE }} />
        ))}
      </div>
    </div>
  );
}
