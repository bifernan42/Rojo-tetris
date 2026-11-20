export default function MainMenu({
  onPlay,
  onLeaderboard,
}: {
  onPlay: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <section className="main-menu-panel" aria-label="Game mode">
      <div className="menu-actions gc-content">
        <button
          className="gc-tile mode-tile mode-tile--multiplayer"
          onClick={onPlay}
        >
          <span className="mode-emblem" aria-hidden="true">
            <span className="mode-piece mode-piece--multiplayer">
              {[0, 1, 2, 3].map((cell) => (
                <span className="cell cell-1" data-kind="L" key={cell} />
              ))}
            </span>
            <span className="mode-piece mode-piece--j">
              {[0, 1, 2, 3].map((cell) => (
                <span className="cell cell-1" data-kind="J" key={cell} />
              ))}
            </span>
          </span>
          <span className="mode-title">Play</span>
          <span className="mode-caption">1+ players</span>
        </button>
        <button
          className="gc-tile mode-tile mode-tile--leaderboard"
          onClick={onLeaderboard}
        >
          <span className="mode-emblem" aria-hidden="true">
            <span className="mode-piece mode-piece--t">
              {[0, 1, 2, 3].map((cell) => (
                <span className="cell cell-1" data-kind="T" key={cell} />
              ))}
            </span>
          </span>
          <span className="mode-title">Leaderboard</span>
          <span className="mode-caption">Top 10 scores</span>
        </button>
      </div>
    </section>
  );
}
