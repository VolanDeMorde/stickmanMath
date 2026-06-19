import { useMemo, useState } from 'react'
import { GameViewport } from './components/GameViewport'

type GameMode = 'campaign' | 'sandbox'
type Difficulty = 'easy' | 'normal' | 'hard'

type GameSettings = {
  difficulty: Difficulty
  year: number
  mathType: string
}

const MATH_TYPES_BY_YEAR: Record<number, string[]> = {
  1: ['Addition (up to 10)', 'Subtraction (up to 10)', 'Number bonds'],
  2: ['Addition (2 digits)', 'Subtraction (2 digits)', 'Simple multiplication'],
  3: ['Multiplication tables', 'Division basics', 'Fractions intro'],
  4: ['Fractions (add/subtract)', 'Decimals intro', 'Factors and multiples'],
  5: ['Fractions and mixed numbers', 'Decimals and percentages', 'Area and perimeter'],
  6: ['Ratio and proportion', 'Integers', 'Order of operations'],
  7: ['Algebra expressions', 'Linear equations', 'Probability basics'],
  8: ['Systems of equations', 'Pythagoras', 'Transformations'],
  9: ['Quadratics intro', 'Indices and surds', 'Trigonometry basics'],
  10: ['Advanced algebra', 'Quadratic equations', 'Coordinate geometry'],
  11: ['Functions', 'Trigonometry identities', 'Statistics'],
  12: ['Calculus intro', 'Advanced functions', 'Data and probability']
}

function App() {
  const [screen, setScreen] = useState<'menu' | 'game' | 'legacy'>('menu')
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [startMode, setStartMode] = useState<GameMode>('campaign')
  const [sessionId, setSessionId] = useState(0)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [year, setYear] = useState(1)
  const mathTypeOptions = useMemo(() => MATH_TYPES_BY_YEAR[year] ?? MATH_TYPES_BY_YEAR[1], [year])
  const [mathType, setMathType] = useState(() => MATH_TYPES_BY_YEAR[1][0])
  const [startSettings, setStartSettings] = useState<GameSettings>({
    difficulty: 'normal',
    year: 1,
    mathType: MATH_TYPES_BY_YEAR[1][0]
  })

  const startGame = (mode: GameMode) => {
    setStartSettings({ difficulty, year, mathType })
    setStartMode(mode)
    setSessionId((prev) => prev + 1)
    setScreen('game')
  }

  const onYearChange = (nextYear: number) => {
    setYear(nextYear)
    const nextOptions = MATH_TYPES_BY_YEAR[nextYear] ?? MATH_TYPES_BY_YEAR[1]
    setMathType(nextOptions[0])
  }

  return (
    <div className="app-shell app-shell-game">
      {screen === 'menu' ? (
        <main className="menu-screen">
          <section className="menu-card" aria-label="Main menu">
            <h1>Stickman Math</h1>
            <p>Choose your learning setup and jump in.</p>

            <div className="menu-config-grid" aria-label="Game setup">
              <label className="menu-field" htmlFor="difficulty-select">
                <span>Difficulty</span>
                <select
                  id="difficulty-select"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label className="menu-field" htmlFor="year-select">
                <span>Year</span>
                <select
                  id="year-select"
                  value={year}
                  onChange={(event) => onYearChange(Number.parseInt(event.target.value, 10))}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((yearOption) => (
                    <option key={yearOption} value={yearOption}>
                      Year {yearOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="menu-field menu-field-full" htmlFor="math-type-select">
                <span>Type of math</span>
                <select id="math-type-select" value={mathType} onChange={(event) => setMathType(event.target.value)}>
                  {mathTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="menu-selection-hint">
              Selected: {difficulty.toUpperCase()} | Year {year} | {mathType}
            </p>

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
          <GameViewport key={sessionId} initialMode={startMode} initialSettings={startSettings} />
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
