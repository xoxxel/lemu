import { SyntaxHighlight } from '../../lib/syntax';

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
    }}>
      <div style={{
        padding: '8px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 12,
        color: 'var(--text-muted)',
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
      }}>
        {data.path}
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg-primary)',
      }}>
        <SyntaxHighlight code={data.content} path={data.path} />
      </div>
    </div>
  );
}
