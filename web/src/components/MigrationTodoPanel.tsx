type MigrationTodoPanelProps = {
  tasks: readonly string[]
  className?: string
}

export function MigrationTodoPanel({ tasks, className }: MigrationTodoPanelProps) {
  return (
    <section id="migration-panel" className={className || 'task-panel'}>
      <h2>Migration Todo</h2>
      <ol>
        {tasks.map((task) => (
          <li key={task}>{task}</li>
        ))}
      </ol>
    </section>
  )
}
