interface TaskItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface TaskData {
  tasks: TaskItem[];
}

const statusIcon: Record<string, string> = {
  pending: '\u25CB',
  in_progress: '\u25D0',
  completed: '\u2713',
  cancelled: '\u2717',
};

export function TaskBoardView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as TaskData;
  const tasks = data.tasks ?? [];

  return (
    <div style={{ padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      {tasks.length === 0 && (
        <div style={{ color: 'var(--color-text-tertiary)', padding: 24, textAlign: 'center' }}>
          No tasks.
        </div>
      )}
      {tasks.map((t) => (
        <div key={t.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          marginBottom: 4,
          borderRadius: 6,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          opacity: t.status === 'completed' ? 0.5 : 1,
        }}>
          <span style={{ fontSize: 16, color: t.status === 'completed' ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }}>
            {statusIcon[t.status] ?? '\u25CB'}
          </span>
          <span style={{
            textDecoration: t.status === 'completed' ? 'line-through' : 'none',
            color: 'var(--color-text-primary)',
          }}>
            {t.description}
          </span>
        </div>
      ))}
    </div>
  );
}
