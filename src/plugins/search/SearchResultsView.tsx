import { useState } from 'react';

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

interface SearchResultsState {
  results: SearchResult[];
  query?: string;
}

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto' as const,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    lineHeight: '1.5',
  },
  summary: {
    padding: '4px 0 8px',
    fontSize: 12,
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    marginBottom: 4,
    flexShrink: 0 as const,
  },
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '3px 8px',
    margin: '1px 0',
    borderRadius: 3,
    cursor: 'default',
    transition: 'background 0.1s',
  },
  rowSelected: {
    background: 'var(--bg-hover)',
  },
  rowId: {
    color: 'var(--text-muted)',
    fontSize: 11,
    minWidth: 28,
    textAlign: 'right' as const,
    flexShrink: 0 as const,
    userSelect: 'none' as const,
  },
  filePath: {
    color: 'var(--accent)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    maxWidth: '40%',
    flexShrink: 0 as const,
  },
  lineNum: {
    color: 'var(--text-muted)',
    fontSize: 11,
    flexShrink: 0 as const,
    minWidth: 40,
  },
  preview: {
    color: 'var(--text-secondary)',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  highlight: {
    color: 'var(--yellow)',
  },
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !text.toLowerCase().includes(query.toLowerCase())) {
    return <>{text}</>;
  }
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={styles.highlight}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function SearchResultsView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as SearchResultsState;
  const results = data.results ?? [];
  const query = data.query ?? '';
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  return (
    <div style={styles.container}>
      <div style={styles.summary}>
        {results.length} result{results.length !== 1 ? 's' : ''}
        {query ? ` for "${query}"` : ''}
      </div>
      {results.map((r, i) => {
        const rowNum = i + 1;
        const isSelected = selectedRow === rowNum;
        return (
          <div
            key={i}
            style={{
              ...styles.row,
              ...(isSelected ? styles.rowSelected : {}),
            }}
            onClick={() => setSelectedRow(rowNum === selectedRow ? null : rowNum)}
          >
            <span style={styles.rowId}>[{rowNum}]</span>
            <span style={styles.filePath} title={r.file}>{r.file}</span>
            {r.line > 0 && <span style={styles.lineNum}>:{r.line}</span>}
            <span style={styles.preview}>
              {r.line > 0 && r.content ? (
                <HighlightedText text={r.content.trim()} query={query} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(filename match)</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
