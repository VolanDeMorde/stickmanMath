export function LegacyGameViewport() {
  return (
    <section className="game-panel">
      <div className="game-panel-header">
        <span>Legacy Bridge Preview</span>
        <span className="status-pill">Running</span>
      </div>
      <iframe
        title="Legacy Stickman Game"
        src="/legacy/sample.html"
        className="game-frame"
        allow="fullscreen"
      />
    </section>
  )
}
