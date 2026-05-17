export default function SearchView({ state }: { state: Record<string, unknown> }) {
  const results = state.results as Array<{ file: string; line: number; content: string }> | undefined;
  if (!results || results.length === 0) {
    return <div className="empty-state">No results</div>;
  }
  return (
    <div className="search-results-list">
      <div className="search-results-header">Found {results.length} result(s)</div>
      {results.map((r, i) => (
        <div key={i} className="search-result">
          <span className="file">{r.file}</span>
          <span className="line">:{r.line}</span>
          <span>{r.content}</span>
        </div>
      ))}
    </div>
  );
}
