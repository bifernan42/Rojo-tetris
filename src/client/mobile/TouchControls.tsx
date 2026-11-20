import type { PlayerMove } from '../../common/protocol';

export function TouchControls({ canPlay, onAction }: {
  canPlay: boolean;
  onAction: (action: PlayerMove) => void;
}) {
  return (
    <div className="touch-controls" role="group" aria-label="Touch game controls">
      <button type="button" disabled={!canPlay} className="gc-button" aria-label="Move left" onClick={() => onAction('MOVE_LEFT')}>←</button>
      <button type="button" disabled={!canPlay} className="gc-button" aria-label="Soft drop" onClick={() => onAction('SOFT_DROP')}>↓</button>
      <button type="button" disabled={!canPlay} className="gc-button" aria-label="Move right" onClick={() => onAction('MOVE_RIGHT')}>→</button>
      <button type="button" disabled={!canPlay} className="gc-button touch-controls-action" onClick={() => onAction('ROTATE_RIGHT')}>Rotate</button>
      <button type="button" disabled={!canPlay} className="gc-button gc-button--primary touch-controls-action" onClick={() => onAction('HARD_DROP')}>Hard drop</button>
    </div>
  );
}
