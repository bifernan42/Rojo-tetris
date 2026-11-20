export function KeyboardControls() {
  return (
    <div className="gc-help gc-controls game-controls" aria-label="Keyboard controls">
      <span><kbd className="gc-key gc-key--nav">← →</kbd>Move</span>
      <span><kbd className="gc-key gc-key--b">↑</kbd>Rotate</span>
      <span><kbd className="gc-key gc-key--nav">↓</kbd>Drop</span>
      <span><kbd className="gc-key gc-key--a">Space</kbd>Hard drop</span>
    </div>
  );
}
