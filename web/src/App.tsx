import { useState } from 'react'
import { GameViewport } from './components/GameViewport'

type GameMode = 'campaign' | 'sandbox'

function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'legacy'>('menu')
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [startMode, setStartMode] = useState<GameMode>('campaign')
  const [sessionId, setSessionId] = useState(0)

  const startGame = (mode: GameMode) => {
    setStartMode(mode)
    setSessionId((prev) => prev + 1)
    setScreen('game')
  }

  return (
    <div className="app-shell app-shell-game">
      {screen === 'menu' ? (
        <main className="menu-screen">
          <section className="menu-card" aria-label="Main menu">
            <h1>Stickman Math</h1>
            <p>Choose a mode and jump in.</p>
            <div className="menu-actions">
              <button type="button" className="menu-btn primary" onClick={() => startGame('campaign')}>
                Play
              </button>
              <button type="button" className="menu-btn" onClick={() => setShowHowToPlay(true)}>
                How To Play
              </button>
              <button type="button" className="menu-btn" onClick={() => startGame('sandbox')}>
                Sandbox
              </button>
              <button type="button" className="menu-btn" onClick={() => setScreen('legacy')}>
                Legacy Mode
              </button>
            </div>
          </section>

          {showHowToPlay ? (
            <div className="howto-overlay" role="dialog" aria-modal="true" aria-label="How to play">
              <div className="howto-card">
                <h2>How To Play</h2>
                <p>Move: A/D or Left/Right arrows</p>
                <p>Jump/Fly: W/S or Up/Down arrows</p>
                <p>Grab/Throw: E or Left Click</p>
                <p>Swing Weapon: Q or Right Click</p>
                <p>Break: X | Undo: Z</p>
                <button type="button" className="menu-btn primary" onClick={() => setShowHowToPlay(false)}>
                  Back
                </button>
              </div>
            </div>
          ) : null}
        </main>
      ) : screen === 'game' ? (
        <main className="game-only-shell">
          <button type="button" className="menu-fab" onClick={() => setScreen('menu')}>
            Menu
          </button>
          <GameViewport key={sessionId} initialMode={startMode} />
        </main>
      ) : (
        <main className="legacy-shell">
          <button type="button" className="menu-fab" onClick={() => setScreen('menu')}>
            Menu
          </button>
          <iframe
            title="Legacy Stickman Math"
            src="/legacy/index.html"
            className="legacy-frame"
            allow="fullscreen"
          />
        </main>
      )}
    </div>
  )
}

export default App
