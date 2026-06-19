import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameCanvas } from './GameCanvas'

type GameMode = 'campaign' | 'sandbox'
type Difficulty = 'easy' | 'normal' | 'hard'
type WeaponType = 'MINUS' | 'ABS' | 'FACTOR' | 'SQRT'
type LayoutType = 'relay' | 'tower' | 'aerial'

type GameSettings = {
  difficulty: Difficulty
  year: number
  mathType: string
}

type FractionVisualTerm = {
  numerator: number
  denominator: number
  operator: '+' | '-' | null
}

type FractionVisual = {
  terms: FractionVisualTerm[]
  resultNumerator: number
  resultDenominator: number
}

type LevelState = {
  stage: number
  expression: string
  target: number
  layout: LayoutType
  isBoss: boolean
  displayExpression?: string
  fractionVisual?: FractionVisual
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function difficultyBump(difficulty: Difficulty) {
  if (difficulty === 'easy') return 0
  if (difficulty === 'hard') return 2
  return 1
}

function parseUpToLimit(mathType: string) {
  const match = mathType.toLowerCase().match(/up to\s*(\d+)/)
  if (!match) return null
  const limit = Number.parseInt(match[1], 10)
  return Number.isFinite(limit) ? limit : null
}

function topicValueCap(settings: GameSettings, fallback: number, hardCap: number) {
  const type = settings.mathType.toLowerCase()
  let cap = fallback

  const upToLimit = parseUpToLimit(settings.mathType)
  if (upToLimit !== null) {
    cap = Math.min(cap, upToLimit)
  }

  if (type.includes('number bonds') && settings.year <= 2) {
    cap = Math.min(cap, 10)
  }

  if (settings.year === 1 && (type.includes('addition') || type.includes('subtraction'))) {
    cap = Math.min(cap, 10)
  }

  return clamp(cap, 2, hardCap)
}

function buildAddition(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const scaledMax = clamp(8 + settings.year * 2 + bump * 3 + Math.floor(stage / 3), 8, 48)
  const maxValue = topicValueCap(settings, scaledMax, 48)
  const termCount = settings.difficulty === 'hard' ? 3 : 2
  const terms = Array.from({ length: termCount }, () => randomInt(1, maxValue))
  const target = terms.reduce((total, value) => total + value, 0)
  return { expression: terms.join(' + '), target }
}

function buildSubtraction(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const scaledMaxA = clamp(12 + settings.year * 3 + bump * 4 + Math.floor(stage / 3), 12, 65)
  const maxA = topicValueCap(settings, scaledMaxA, 65)
  const a = randomInt(Math.max(4, settings.year + 2), maxA)
  const bMax = settings.difficulty === 'hard' ? maxA : a - 1
  const bMin = settings.difficulty === 'easy' ? 1 : Math.max(1, Math.floor(a * 0.35))
  const b = randomInt(bMin, Math.max(bMin, bMax))
  return { expression: `${a} - ${b}`, target: a - b }
}

function buildRepeatedAddition(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const value = randomInt(2, clamp(3 + settings.year + bump + Math.floor(stage / 4), 4, 14))
  const repeats = randomInt(settings.difficulty === 'easy' ? 2 : 3, settings.difficulty === 'hard' ? 5 : 4)
  const terms = Array.from({ length: repeats }, () => value)
  return { expression: terms.join(' + '), target: value * repeats }
}

function buildMixed(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const maxValue = clamp(10 + settings.year * 2 + bump * 3 + Math.floor(stage / 2), 10, 55)
  const a = randomInt(2, maxValue)
  const b = randomInt(1, maxValue)
  const c = randomInt(1, Math.max(2, Math.floor(maxValue * 0.8)))
  const expression = settings.difficulty === 'easy' ? `${a} + ${b}` : `${a} - ${b} + ${c}`
  const target = settings.difficulty === 'easy' ? a + b : a - b + c
  return { expression, target }
}

function buildBoss(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const maxValue = clamp(14 + settings.year * 3 + bump * 4 + Math.floor(stage / 2), 14, 80)
  const a = randomInt(Math.max(8, settings.year + 5), maxValue)
  const b = randomInt(3, Math.max(4, Math.floor(maxValue * 0.7)))
  const c = randomInt(2, Math.max(3, Math.floor(maxValue * 0.65)))
  const d = randomInt(1, Math.max(2, Math.floor(maxValue * 0.45)))
  return {
    expression: `${a} - ${b} + ${c} + ${d}`,
    target: a - b + c + d
  }
}

function buildYoungFractions(stage: number, settings: GameSettings) {
  const bump = difficultyBump(settings.difficulty)
  const maxDenominator = clamp(3 + Math.floor(settings.year / 2) + bump, 3, 8)
  const denominator = randomInt(2, maxDenominator)
  const allowSubtraction = settings.year >= 4 && settings.difficulty !== 'easy'
  const useSubtraction = allowSubtraction && stage % 4 === 0

  let first = randomInt(1, denominator - 1)
  let second = randomInt(1, denominator - 1)

  if (useSubtraction) {
    if (second >= first) {
      second = Math.max(1, first - 1)
    }
  } else {
    const maxSecond = Math.max(1, denominator - first)
    second = randomInt(1, maxSecond)
  }

  const op: '+' | '-' = useSubtraction ? '-' : '+'
  const resultNumerator = op === '+' ? first + second : first - second

  return {
    expression: `${first} ${op} ${second}`,
    target: resultNumerator,
    displayExpression: `${first}/${denominator} ${op} ${second}/${denominator}`,
    fractionVisual: {
      terms: [
        { numerator: first, denominator, operator: null },
        { numerator: second, denominator, operator: op }
      ],
      resultNumerator,
      resultDenominator: denominator
    }
  }
}

function createLevel(stage: number, settings: GameSettings): LevelState {
  const layout: LayoutType = stage % 3 === 0 ? 'aerial' : stage % 3 === 1 ? 'relay' : 'tower'

  if (stage % 10 === 0) {
    const boss = buildBoss(stage, settings)
    return {
      stage,
      expression: boss.expression,
      target: boss.target,
      layout: 'aerial',
      isBoss: true
    }
  }

  const type = settings.mathType.toLowerCase()
  const isFractionTopic = type.includes('fraction')
  const useYoungFractionMode = isFractionTopic && settings.year <= 5

  if (useYoungFractionMode) {
    const generated = buildYoungFractions(stage, settings)
    return {
      stage,
      expression: generated.expression,
      target: generated.target,
      layout,
      isBoss: false,
      displayExpression: generated.displayExpression,
      fractionVisual: generated.fractionVisual
    }
  }

  const generated = type.includes('subtraction')
    ? buildSubtraction(stage, settings)
    : type.includes('addition') || type.includes('number bonds')
      ? buildAddition(stage, settings)
      : type.includes('multiplication') || type.includes('division')
        ? buildRepeatedAddition(stage, settings)
        : buildMixed(stage, settings)

  return {
    stage,
    expression: generated.expression,
    target: generated.target,
    layout,
    isBoss: false
  }
}

type GameViewportProps = {
  initialMode?: GameMode
  initialSettings?: GameSettings
}

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'normal',
  year: 1,
  mathType: 'Addition (up to 10)'
}

export function GameViewport({ initialMode = 'campaign', initialSettings = DEFAULT_SETTINGS }: GameViewportProps) {
  const [mode] = useState<GameMode>(initialMode)
  const cameraMode: 'auto' | 'portrait' | 'landscape' = 'auto'
  const followStrength = 0.14
  const [level, setLevel] = useState<LevelState>(() => createLevel(1, initialSettings))
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
  const [touchStick, setTouchStick] = useState({
    left: false,
    right: false,
    up: false,
    down: false,
    active: false,
    x: 0,
    y: 0
  })
  const [isLevelSidebarMinimized, setIsLevelSidebarMinimized] = useState(false)
  const stickPointerId = useRef<number | null>(null)

  const firstVisibleLevel = Math.max(1, level.stage - 3)
  const visibleLevels = Array.from({ length: 9 }, (_, index) => firstVisibleLevel + index)

  const resetRun = useCallback(() => {
    setLevel(createLevel(1, initialSettings))
    setResetTick((prev) => prev + 1)
  }, [initialSettings])

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
  }, [resetRun])

  const updateTouchStick = useCallback((clientX: number, clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34)
    const deadZone = radius * 0.22
    const distance = Math.hypot(deltaX, deltaY)
    const clampedDistance = Math.min(distance, radius)
    const angle = Math.atan2(deltaY, deltaX)
    const normalizedDistance =
      distance <= deadZone ? 0 : (clampedDistance - deadZone) / Math.max(1, radius - deadZone)
    const normalizedX = Math.cos(angle) * normalizedDistance
    const normalizedY = Math.sin(angle) * normalizedDistance

    setTouchStick({
      active: true,
      x: normalizedX * 26,
      y: normalizedY * 26,
      left: normalizedX < -0.28,
      right: normalizedX > 0.28,
      up: normalizedY < -0.28,
      down: normalizedY > 0.28
    })
  }, [])

  const releaseTouchStick = useCallback(() => {
    setTouchStick({ left: false, right: false, up: false, down: false, active: false, x: 0, y: 0 })
    stickPointerId.current = null
  }, [])

  const combinedInput = useMemo(
    () => ({
      left: reactInput.left || touchStick.left,
      right: reactInput.right || touchStick.right,
      up: reactInput.up || touchStick.up,
      down: reactInput.down || touchStick.down
    }),
    [reactInput, touchStick]
  )

  const fireCommand = (type: 'grab' | 'swing' | 'break' | 'undo') => {
    setCommandTicks((prev) => ({ ...prev, [type]: prev[type] + 1 }))
  }

  const handleLevelSolved = (reward: number) => {
    void reward
    setLevel((prev) => createLevel(prev.stage + 1, initialSettings))
    setResetTick((prev) => prev + 1)
  }

  const jumpToLevel = (stage: number) => {
    setLevel(createLevel(stage, initialSettings))
    setResetTick((prev) => prev + 1)
  }

  return (
    <section className="game-panel">
      <div className="react-game-layout">
        <aside className={`level-sidebar${isLevelSidebarMinimized ? ' minimized' : ''}`} aria-label="Level sidebar">
          <div className="level-sidebar-header">
            {!isLevelSidebarMinimized ? <h2>Levels</h2> : null}
            <button
              type="button"
              className="level-sidebar-toggle"
              onClick={() => setIsLevelSidebarMinimized((prev) => !prev)}
              aria-label={isLevelSidebarMinimized ? 'Expand levels sidebar' : 'Minimize levels sidebar'}
            >
              {isLevelSidebarMinimized ? '>' : '<'}
            </button>
          </div>

          {!isLevelSidebarMinimized ? (
            <div className="level-list" aria-label="Level list">
              {visibleLevels.map((stageNumber) => (
                <button
                  key={stageNumber}
                  type="button"
                  className={`level-chip${stageNumber === level.stage ? ' active' : ''}`}
                  onClick={() => jumpToLevel(stageNumber)}
                >
                  Level {stageNumber}
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="game-frame react-canvas-shell">
          <div className="level-top-right" aria-label="Current level">
            Level {level.stage}
          </div>
          <div className="level-settings-top-right" aria-label="Current settings">
            Year {initialSettings.year} | {initialSettings.difficulty.toUpperCase()} | {initialSettings.mathType}
          </div>
          <GameCanvas
            className="react-canvas"
            mode={mode}
            expression={level.expression}
            displayExpression={level.displayExpression}
            fractionVisual={level.fractionVisual}
            target={level.target}
            stage={level.stage}
            isBoss={level.isBoss}
            layout={level.layout}
            activeWeapon={activeWeapon}
            cameraMode={cameraMode}
            followStrength={followStrength}
            inputState={combinedInput}
            resetTick={resetTick}
            commandTicks={commandTicks}
            onLevelSolved={handleLevelSolved}
          />
          <div className="react-touch-pad" aria-label="React mode touch controls">
            <div className="touch-hand touch-hand-left" aria-label="Movement controls">
              <button
                type="button"
                className={`analog-stick${touchStick.active ? ' active' : ''}`}
                aria-label="Analog movement stick"
                onPointerDown={(event) => {
                  stickPointerId.current = event.pointerId
                  event.currentTarget.setPointerCapture(event.pointerId)
                  updateTouchStick(event.clientX, event.clientY, event.currentTarget)
                }}
                onPointerMove={(event) => {
                  if (stickPointerId.current !== event.pointerId) return
                  updateTouchStick(event.clientX, event.clientY, event.currentTarget)
                }}
                onPointerUp={() => releaseTouchStick()}
                onPointerCancel={() => releaseTouchStick()}
                onLostPointerCapture={() => releaseTouchStick()}
              >
                <span className="analog-stick-ring" aria-hidden="true" />
                <span
                  className="analog-stick-thumb"
                  aria-hidden="true"
                  style={{
                    ['--stick-x' as string]: `${touchStick.x}px`,
                    ['--stick-y' as string]: `${touchStick.y}px`,
                    ['--stick-scale' as string]: touchStick.active ? '1' : '0.96'
                  }}
                />
                <span className="analog-stick-label">Move</span>
              </button>
            </div>

            <div className="touch-hand touch-hand-right" aria-label="Action controls">
              <div className="pad-row">
                <button type="button" className="pad-btn" onPointerUp={() => fireCommand('grab')}>
                  Grab
                </button>
                <button type="button" className="pad-btn" onPointerUp={() => fireCommand('swing')}>
                  Swing
                </button>
              </div>
              <div className="pad-row">
                <button type="button" className="pad-btn" onPointerUp={() => fireCommand('break')}>
                  Break
                </button>
                <button type="button" className="pad-btn" onPointerUp={() => fireCommand('undo')}>
                  Undo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
