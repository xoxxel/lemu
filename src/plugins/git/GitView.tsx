interface GitData {
  command: string;
  stdout: string;
  stderr: string;
}

export function GitView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as GitData;

  return (
    <div style={{ padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      {data.command && (
        <div style={{
          padding: '6px 12px',
          marginBottom: 12,
          borderRadius: 6,
          background: 'var(--color-background-secondary)',
          color: 'var(--color-text-secondary)',
          fontSize: 12,
        }}>
          $ git {data.command}
        </div>
      )}
      {data.stdout && (
        <pre style={{
          margin: 0,
          padding: 12,
          borderRadius: 6,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-primary)',
        }}>{data.stdout}</pre>
      )}
      {data.stderr && (
        <pre style={{
          margin: '8px 0 0',
          padding: 12,
          borderRadius: 6,
          background: 'var(--color-background-error)',
          border: '0.5px solid var(--color-border-error)',
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-error)',
        }}>{data.stderr}</pre>
      )}
    </div>
  );
}
