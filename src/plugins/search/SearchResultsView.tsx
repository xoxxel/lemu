interface SearchResult {
  file: string;
  line: number;
  content: string;
}

interface SearchData {
  results: SearchResult[];
}

export function SearchResultsView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as SearchData;
  const results = data.results ?? [];

  return (
    <div style={{ padding: 16, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
      <div style={{
        marginBottom: 12,
        fontSize: 12,
        color: 'var(--color-text-secondary)',
      }}>
        {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
      {results.map((r, i) => (
        <div key={i} style={{
          padding: '8px 12px',
          marginBottom: 4,
          borderRadius: 6,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11, marginBottom: 4 }}>
            {r.file}:{r.line}
          </div>
          <div style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
            {r.content}
          </div>
        </div>
      ))}
    </div>
  );
}
