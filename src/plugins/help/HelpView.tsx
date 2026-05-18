interface HelpData {
  content: string;
}

export function HelpView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as HelpData;

  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6 }}>
      <pre style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        color: 'var(--color-text-primary)',
      }}>{data.content}</pre>
    </div>
  );
}
