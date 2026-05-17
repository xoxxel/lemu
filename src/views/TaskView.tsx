export default function TaskView({ state }: { state: Record<string, unknown> }) {
  const tasks = state.tasks as Array<{ id: string; description: string; status: string }> | undefined;
  if (!tasks || tasks.length === 0) {
    return <div className="empty-state">No tasks.</div>;
  }
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <div key={t.id} className={`task-item ${t.status === 'completed' ? 'completed' : ''}`}>
          [{t.status === 'completed' ? 'x' : ' '}] {t.description}
        </div>
      ))}
    </div>
  );
}
