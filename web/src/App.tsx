import { useEffect, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { GameViewport } from './components/GameViewport'
import { MigrationTodoPanel } from './components/MigrationTodoPanel'
import { migrationTasks } from './data/migrationTasks'

function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1025px)')
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsPanelOpen(false)
      }
    }

    if (media.addEventListener) {
      media.addEventListener('change', onDesktop)
      return () => media.removeEventListener('change', onDesktop)
    }

    media.addListener(onDesktop)
    return () => media.removeListener(onDesktop)
  }, [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPanelOpen(false)
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [])

  return (
    <div className={`app-shell ${isPanelOpen ? 'panel-open' : ''}`}>
      <AppHeader
        title="Stickman Math React Migration"
        subtitle="Phase 1 complete: React shell + legacy game bridge."
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
      />

      <main className="app-main">
        <button
          type="button"
          className="drawer-scrim"
          aria-label="Close side panel"
          onClick={() => setIsPanelOpen(false)}
        />
        <MigrationTodoPanel
          tasks={migrationTasks}
          className="task-panel task-panel-drawer"
        />
        <GameViewport />
      </main>
    </div>
  )
}

export default App
