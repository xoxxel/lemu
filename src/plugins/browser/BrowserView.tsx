interface BrowserData {
  path: string;
  content: string;
}

export function BrowserView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as BrowserData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '8px 16px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
        fontSize: 12,
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        {data.path}
      </div>
      <iframe
        srcDoc={data.content}
        style={{ flex: 1, width: '100%', border: 'none' }}
        sandbox="allow-scripts"
        title={data.path}
      />
    </div>
  );
}
