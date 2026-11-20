import { useState, type CSSProperties } from 'react';
import { createTetromino, TETROMINO_KINDS } from '../../engine/tetrominoes';

export default function FallingTetrominoes() {
  const [pieces] = useState(() => Array.from({ length: 14 }, (_, index) => {
    const kind = TETROMINO_KINDS[Math.floor(Math.random() * TETROMINO_KINDS.length)]!;
    return {
      ...createTetromino(kind),
      style: {
        left: `${(index + Math.random()) * 100 / 14}%`,
        animationDuration: `${14 + Math.random() * 14}s`,
        animationDelay: `${-Math.random() * 28}s`,
        '--drift': `${Math.random() * 160 - 80}px`,
      } as CSSProperties,
    };
  }));

  return (
    <div className="falling-tetrominoes" aria-hidden="true">
      {pieces.map(({ kind, cells, style }, index) => (
        <div className="falling-tetromino" key={index} style={style}>
          {cells.map(([x, y]) => (
            <span className="cell cell-1" data-kind={kind} key={`${x},${y}`}
              style={{ gridColumn: x + 1, gridRow: y + 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
