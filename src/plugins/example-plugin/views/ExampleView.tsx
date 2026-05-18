function ExampleView({ state }: { state: Record<string, unknown> }) {
  const text = (state.text as string) || 'No output yet. Try typing /echo hello';

  return (
    <div
      style={{
        padding: '24px',
        fontFamily: 'monospace',
        color: '#0f0',
        whiteSpace: 'pre-wrap',
      }}
    >
      <h3 style={{ margin: '0 0 12px', color: '#0f0' }}>Example Output</h3>
      <div>{text}</div>
    </div>
  );
}

export default ExampleView;
