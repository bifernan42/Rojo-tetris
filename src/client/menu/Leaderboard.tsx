import { useEffect, useState } from 'react';
import type { ScoreEntry } from '../../common/protocol';

export default function Leaderboard({ onMenu }: { onMenu: () => void }) {
  const [scores, setScores] = useState<ScoreEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/leaderboard', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Cannot load scores');
        return response.json() as Promise<ScoreEntry[]>;
      })
      .then(setScores)
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  return (
    <section className="leaderboard" aria-label="Leaderboard">
      <h2 className="gc-title">Leaderboard</h2>
      {error ? <p className="gc-help" role="alert">Cannot load scores. Try again later.</p>
        : scores === null ? <p className="gc-help" role="status">Loading...</p>
          : scores.length === 0 ? <p className="gc-help">No scores yet. Clear your first line!</p>
            : <ol className="leaderboard-list">
              {scores.map(({ name, score }, index) => (
                <li key={name} className="gc-panel leaderboard-row">
                  <span className="leaderboard-rank">{index + 1}</span>
                  <span className="leaderboard-name" title={name}>{name}</span>
                  <strong>{score}</strong>
                </li>
              ))}
            </ol>}
      <button className="gc-button" onClick={onMenu}>Menu</button>
    </section>
  );
}
