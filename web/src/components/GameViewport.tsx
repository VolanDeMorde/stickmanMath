import { useEffect, useState } from 'react'
import { GameCanvas } from './GameCanvas'

type GameMode = 'campaign' | 'sandbox'
type WeaponType = 'MINUS' | 'ABS' | 'FACTOR' | 'SQRT'
type LayoutType = 'relay' | 'tower' | 'aerial'

type LevelState = {
  stage: number
  expression: string
  target: number
  layout: LayoutType
  isBoss: boolean
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createLevel(stage: number): LevelState {
  const layout: LayoutType = stage % 3 === 0 ? 'aerial' : stage % 3 === 1 ? 'relay' : 'tower'

  if (stage % 10 === 0) {
    const a = randomInt(8, 14)
    const b = randomInt(5, 11)
    const c = randomInt(3, 9)
    const d = randomInt(2, 6)
    const target = a - b + c + d
    return {
      stage,
      expression: `${a} - ${b} + ${c} + ${d}`,
      target,
      layout: 'aerial',
      isBoss: true
    }
  }

  const pattern = stage % 3
  if (pattern === 0) {
    const a = randomInt(2, 10)
    const b = randomInt(1, a - 1)
    return { stage, expression: `${a} - ${b}`, target: a - b, layout, isBoss: false }
  }
  if (pattern === 1) {
    const a = randomInt(1, 8)
    const b = randomInt(1, 8)
    return { stage, expression: `${a} + ${b}`, target: a + b, layout, isBoss: false }
  }

  const a = randomInt(3, 9)
  const b = randomInt(1, 5)
  const c = randomInt(1, 4)
  return { stage, expression: `${a} - ${b} + ${c}`, target: a - b + c, layout, isBoss: false }
}

type GameViewportProps = {
  initialMode?: GameMode
}

export function GameViewport({ initialMode = 'campaign' }: GameViewportProps) {
  const [mode] = useState<GameMode>(initialMode)
  const cameraMode: 'auto' | 'portrait' | 'landscape' = 'auto'
  const followStrength = 0.14
  const [level, setLevel] = useState<LevelState>(() => createLevel(1))
  const [resetTick, setResetTick] = useState(0)
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('MINUS')
  const [commandTicks, setCommandTicks] = useState({
    grab: 0,
    swing: 0,
    break: 0,
    undo: 0
  })
  const [reactInput, setReactInput] = useState({
    left: false,
    right: false,
    up: false,
    down: false
  })

  function resetRun() {
    setLevel(createLevel(1))
    setResetTick((prev) => prev + 1)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'e', 'q', 'x', 'z', 'r', '1', '2', '3', '4'].includes(key)) {
        event.preventDefault()
      }
      if (['w', 'arrowup'].includes(key)) setReactInput((prev) => ({ ...prev, up: true }))
      if (['s', 'arrowdown'].includes(key)) setReactInput((prev) => ({ ...prev, down: true }))
      if (['a', 'arrowleft'].includes(key)) setReactInput((prev) => ({ ...prev, left: true }))
      if (['d', 'arrowright'].includes(key)) setReactInput((prev) => ({ ...prev, right: true }))
      if (key === 'e') setCommandTicks((prev) => ({ ...prev, grab: prev.grab + 1 }))
      if (key === 'q') setCommandTicks((prev) => ({ ...prev, swing: prev.swing + 1 }))
      if (key === 'x') setCommandTicks((prev) => ({ ...prev, break: prev.break + 1 }))
      if (key === 'z') setCommandTicks((prev) => ({ ...prev, undo: prev.undo + 1 }))
      if (key === 'r') resetRun()
      if (key === '1') setActiveWeapon('MINUS')
      if (key === '2') setActiveWeapon('ABS')
      if (key === '3') setActiveWeapon('FACTOR')
      if (key === '4') setActiveWeapon('SQRT')
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
  }, [])

  const holdInput = (key: 'left' | 'right' | 'up' | 'down', value: boolean) => {
    setReactInput((prev) => ({ ...prev, [key]: value }))
  }

  const fireCommand = (type: 'grab' | 'swing' | 'break' | 'undo') => {
    setCommandTicks((prev) => ({ ...prev, [type]: prev[type] + 1 }))
  }

  const handleLevelSolved = (reward: number) => {
    void reward
    setLevel((prev) => createLevel(prev.stage + 1))
    setResetTick((prev) => prev + 1)
  }

  return (
    <section className="game-panel">
      <div className="game-frame react-canvas-shell">
        <GameCanvas
          className="react-canvas"
          mode={mode}
          expression={level.expression}
          target={level.target}
          stage={level.stage}
          isBoss={level.isBoss}
          layout={level.layout}
          activeWeapon={activeWeapon}
          cameraMode={cameraMode}
          followStrength={followStrength}
          inputState={reactInput}
          resetTick={resetTick}
          commandTicks={commandTicks}
          onLevelSolved={handleLevelSolved}
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
          <div className="pad-row">
            <button type="button" className="pad-btn" onPointerUp={() => fireCommand('grab')}>
              Grab
            </button>
            <button type="button" className="pad-btn" onPointerUp={() => fireCommand('swing')}>
              Swing
            </button>
            <button type="button" className="pad-btn" onPointerUp={() => fireCommand('break')}>
              Break
            </button>
            <button type="button" className="pad-btn" onPointerUp={() => fireCommand('undo')}>
              Undo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
