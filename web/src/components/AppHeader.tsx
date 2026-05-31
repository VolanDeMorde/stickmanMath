type AppHeaderProps = {
  title: string
  subtitle: string
  isPanelOpen: boolean
  onTogglePanel: () => void
}

export function AppHeader({ title, subtitle, isPanelOpen, onTogglePanel }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="panel-toggle"
          aria-expanded={isPanelOpen}
          aria-controls="migration-panel"
          onClick={onTogglePanel}
        >
          {isPanelOpen ? 'Close Panel' : 'Open Panel'}
        </button>
        <a className="open-link" href="/legacy/index.html" target="_blank" rel="noreferrer">
          Open Legacy Game
        </a>
      </div>
    </header>
  )
}
