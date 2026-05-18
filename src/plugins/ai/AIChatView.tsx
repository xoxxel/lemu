interface AIData {
  content?: string;
  role?: string;
  response?: { role: string; content: string };
  logs?: string[];
}

export function AIChatView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as AIData;

  const isAgent = !!data.response;

  if (isAgent) {
    return (
      <div style={{ padding: 24, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6 }}>
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          marginBottom: 16,
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-primary)',
        }}>
          {data.response?.content ?? '(no response)'}
        </div>
        {data.logs && data.logs.length > 0 && (
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 8,
            }}>
              Tool calls ({data.logs.length})
            </div>
            {data.logs.map((log, i) => (
              <pre key={i} style={{
                margin: '0 0 4px',
                padding: '6px 10px',
                borderRadius: 4,
                background: 'var(--color-background-secondary)',
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                color: 'var(--color-text-secondary)',
              }}>{log}</pre>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.6 }}>
      <div style={{
        padding: 16,
        borderRadius: 8,
        background: 'var(--color-background-secondary)',
        border: '0.5px solid var(--color-border-tertiary)',
        whiteSpace: 'pre-wrap',
        color: 'var(--color-text-primary)',
      }}>
        {data.content ?? '(no response)'}
      </div>
    </div>
  );
}
