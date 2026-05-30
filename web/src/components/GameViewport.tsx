import { useEffect, useMemo, useState } from 'react'
import { GameCanvas } from './GameCanvas'
import { useLegacyBridge } from '../hooks/useLegacyBridge'

export function GameViewport() {
  const [mode, setMode] = useState<'legacy' | 'react'>('legacy')
  const [cameraMode, setCameraMode] = useState<'auto' | 'portrait' | 'landscape'>('auto')
  const [followStrength, setFollowStrength] = useState(0.14)
  const [reactInput, setReactInput] = useState({
    left: false,
    right: false,
    up: false,
    down: false
  })
  const { iframeRef, isReady, onFrameLoad, runCommand, snapshot } = useLegacyBridge()

  const switchMode = (nextMode: 'legacy' | 'react') => {
    if (nextMode !== 'react') {
      setReactInput({ left: false, right: false, up: false, down: false })
    }
    setMode(nextMode)
  }

  const controlButtons = useMemo(
    () => [
      { label: 'Undo', action: () => runCommand({ type: 'undo' }) },
      { label: 'Break', action: () => runCommand({ type: 'break' }) },
      { label: 'Reset', action: () => runCommand({ type: 'reset' }) },
      { label: 'Campaign', action: () => runCommand({ type: 'mode', value: 'campaign' }) },
      { label: 'Sandbox', action: () => runCommand({ type: 'mode', value: 'sandbox' }) },
      { label: 'Sound', action: () => runCommand({ type: 'toggleMute' }) }
    ],
    [runCommand]
  )

  useEffect(() => {
    if (mode !== 'legacy' || !isReady) return

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key === 'z') runCommand({ type: 'undo' })
      if (key === 'x') runCommand({ type: 'break' })
      if (key === 'r') runCommand({ type: 'reset' })
      if (key === 'm') runCommand({ type: 'toggleMute' })
      if (key === '1') runCommand({ type: 'mode', value: 'campaign' })
      if (key === '2') runCommand({ type: 'mode', value: 'sandbox' })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isReady, mode, runCommand])

  useEffect(() => {
    if (mode !== 'react') return

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'arrowup'].includes(key)) setReactInput((prev) => ({ ...prev, up: true }))
      if (['s', 'arrowdown'].includes(key)) setReactInput((prev) => ({ ...prev, down: true }))
      if (['a', 'arrowleft'].includes(key)) setReactInput((prev) => ({ ...prev, left: true }))
      if (['d', 'arrowright'].includes(key)) setReactInput((prev) => ({ ...prev, right: true }))
    }

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'arrowup'].includes(key)) setReactInput((prev) => ({ ...prev, up: false }))
      if (['s', 'arrowdown'].includes(key)) setReactInput((prev) => ({ ...prev, down: false }))
      if (['a', 'arrowleft'].includes(key)) setReactInput((prev) => ({ ...prev, left: false }))
      if (['d', 'arrowright'].includes(key)) setReactInput((prev) => ({ ...prev, right: false }))
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [mode])

  const holdInput = (key: 'left' | 'right' | 'up' | 'down', value: boolean) => {
    setReactInput((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <section className="game-panel">
      <div className="game-panel-header stacked">
        <div className="view-mode-tabs" role="tablist" aria-label="Game viewport mode">
          <button
            type="button"
            className={`view-tab ${mode === 'legacy' ? 'active' : ''}`}
            onClick={() => switchMode('legacy')}
          >
            Legacy Bridge
          </button>
          <button
            type="button"
            className={`view-tab ${mode === 'react' ? 'active' : ''}`}
            onClick={() => switchMode('react')}
          >
            React Canvas Alpha
          </button>
        </div>
        <span className="status-pill">{mode === 'legacy' ? 'Running' : 'Experimental'}</span>
      </div>

      {mode === 'legacy' ? (
        <>
          <div className="legacy-control-strip" aria-label="Legacy bridge controls">
            {controlButtons.map((button) => (
              <button
                key={button.label}
                type="button"
                className="legacy-control-btn"
                onClick={button.action}
                disabled={!isReady}
              >
                {button.label}
              </button>
            ))}
            <span className={`bridge-status ${isReady ? 'ready' : 'loading'}`}>
              {isReady ? 'Bridge Ready' : 'Loading...'}
            </span>
          </div>
          <div className="legacy-shortcuts-strip" aria-label="Keyboard shortcuts">
            <span className="shortcut-chip">Z Undo</span>
            <span className="shortcut-chip">X Break</span>
            <span className="shortcut-chip">R Reset</span>
            <span className="shortcut-chip">M Sound</span>
            <span className="shortcut-chip">1 Campaign</span>
            <span className="shortcut-chip">2 Sandbox</span>
          </div>
          <div className="legacy-hud-strip" aria-label="React HUD mirror">
            <span className="hud-chip">Mode: {snapshot.mode}</span>
            <span className="hud-chip">Tier: {snapshot.tier}</span>
            <span className="hud-chip">Stage: {snapshot.stage}</span>
            <span className="hud-chip">Score: {snapshot.score.toLocaleString()}</span>
            <span className="hud-chip">Streak: {snapshot.streak}</span>
            <span className="hud-chip">Reward: +{snapshot.reward}</span>
          </div>
          <iframe
            ref={iframeRef}
            onLoad={onFrameLoad}
            title="Legacy Stickman Game"
            src="/legacy/sample.html"
            className="game-frame"
            allow="fullscreen"
          />
        </>
      ) : (
        <>
          <div className="react-settings-strip" aria-label="Camera settings">
            <div className="settings-group">
              <span className="settings-label">Camera Mode</span>
              <div className="view-mode-tabs" role="tablist" aria-label="Camera orientation mode">
                <button
                  type="button"
                  className={`view-tab ${cameraMode === 'auto' ? 'active' : ''}`}
                  onClick={() => setCameraMode('auto')}
                >
                  Auto
                </button>
                <button
                  type="button"
                  className={`view-tab ${cameraMode === 'portrait' ? 'active' : ''}`}
                  onClick={() => setCameraMode('portrait')}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  className={`view-tab ${cameraMode === 'landscape' ? 'active' : ''}`}
                  onClick={() => setCameraMode('landscape')}
                >
                  Landscape
                </button>
              </div>
            </div>
            <label className="follow-control" htmlFor="followStrengthRange">
              <span className="settings-label">Follow Strength {Math.round(followStrength * 100)}%</span>
              <input
                id="followStrengthRange"
                className="follow-range"
                type="range"
                min="5"
                max="30"
                step="1"
                value={Math.round(followStrength * 100)}
                onChange={(event) => setFollowStrength(Number(event.target.value) / 100)}
              />
            </label>
          </div>
          <div className="game-frame react-canvas-shell">
            <GameCanvas
              className="react-canvas"
              cameraMode={cameraMode}
              followStrength={followStrength}
              inputState={reactInput}
            />
            <div className="react-touch-pad" aria-label="React mode movement controls">
              <button
                type="button"
                className="pad-btn"
                onPointerDown={() => holdInput('up', true)}
                onPointerUp={() => holdInput('up', false)}
                onPointerCancel={() => holdInput('up', false)}
                onPointerLeave={(event) => {
                  if (event.buttons === 0) holdInput('up', false)
                }}
              >
                Up
              </button>
              <div className="pad-row">
                <button
                  type="button"
                  className="pad-btn"
                  onPointerDown={() => holdInput('left', true)}
                  onPointerUp={() => holdInput('left', false)}
                  onPointerCancel={() => holdInput('left', false)}
                  onPointerLeave={(event) => {
                    if (event.buttons === 0) holdInput('left', false)
                  }}
                >
                  Left
                </button>
                <button
                  type="button"
                  className="pad-btn"
                  onPointerDown={() => holdInput('down', true)}
                  onPointerUp={() => holdInput('down', false)}
                  onPointerCancel={() => holdInput('down', false)}
                  onPointerLeave={(event) => {
                    if (event.buttons === 0) holdInput('down', false)
                  }}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="pad-btn"
                  onPointerDown={() => holdInput('right', true)}
                  onPointerUp={() => holdInput('right', false)}
                  onPointerCancel={() => holdInput('right', false)}
                  onPointerLeave={(event) => {
                    if (event.buttons === 0) holdInput('right', false)
                  }}
                >
                  Right
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
