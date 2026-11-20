import type { Tetromino } from '../../engine/tetrominoes';

export default function NextTetromino({ tetromino }: { tetromino: Tetromino | null }) {
  const xs = tetromino?.cells.map(([x]) => x) ?? [0];
  const ys = tetromino?.cells.map(([, y]) => y) ?? [0];
  const left = Math.min(...xs);
  const top = Math.min(...ys);

  return (
    <div className="next-tetromino">
      <span className="gc-label">Next</span>
      <div className="next-tetromino-box gc-help" role="img" aria-label={tetromino ? `Next piece: ${tetromino.kind}` : 'No next piece'}>
        {tetromino && <div className="next-tetromino-shape" style={{
          gridTemplateColumns: `repeat(${Math.max(...xs) - left + 1}, 24px)`,
          gridTemplateRows: `repeat(${Math.max(...ys) - top + 1}, 24px)`,
        }}>
          {tetromino.cells.map(([x, y]) => (
            <span key={`${x}-${y}`} className="cell cell-1" data-kind={tetromino.kind}
              style={{ gridColumn: x - left + 1, gridRow: y - top + 1 }} />
          ))}
        </div>}
      </div>
    </div>
  );
}
