interface EditorData {
  path: string;
  content: string;
}

export function EditorView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as EditorData;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
    }}>
      <div style={{
        padding: '8px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        flexShrink: 0,
      }}>
        {data.path}
      </div>
      <textarea
        value={data.content}
        readOnly
        style={{
          flex: 1,
          width: '100%',
          padding: '16px 20px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          tabSize: 2,
          background: 'var(--color-background-primary)',
          color: 'var(--color-text-primary)',
        }}
      />
    </div>
  );
}
