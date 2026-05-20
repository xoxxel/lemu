import { SyntaxHighlight, tokenize } from '../../lib/syntax';
import { findAllMatches } from './find';

interface EditorData {
  path: string;
  content: string;
  findMode?: boolean;
  findQuery?: string;
  findIndex?: number;
  findCount?: number;
}

function renderWithFindHighlights(code: string, path: string, query: string, currentMatchIdx: number) {
  const matches = findAllMatches(code, query);
  if (matches.length === 0) {
    return <SyntaxHighlight code={code} path={path} />;
  }

  const currentMatch = currentMatchIdx >= 0 && currentMatchIdx < matches.length ? matches[currentMatchIdx] : null;
  const lines = code.split('\n');
  const lineOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineOffsets.push(offset);
    offset += lines[i].length + 1;
  }

  function isInMatch(lineIdx: number, colStart: number, colEnd: number): { match: boolean; current: boolean } {
    const lineStart = lineOffsets[lineIdx];
    const lineEnd = lineStart + lines[lineIdx].length;
    for (const m of matches) {
      if (m.start < lineEnd && m.end > lineStart) {
        const overlapStart = Math.max(m.start, lineStart);
        const overlapEnd = Math.min(m.end, lineEnd);
        if (overlapStart < lineEnd && overlapEnd > lineStart &&
            overlapStart < lineStart + colEnd && overlapEnd > lineStart + colStart) {
          return {
            match: true,
            current: currentMatch !== null && m.start === currentMatch.start && m.end === currentMatch.end,
          };
        }
      }
    }
    return { match: false, current: false };
  }

  const tokenized = tokenize(code, path);

  return (
    <pre className="syntax-highlight">
      {tokenized.map((line) => (
        <div key={line.lineNumber} className="syntax-line">
          <span className="line-number">{line.lineNumber}</span>
          <span className="line-content">
            {(() => {
              let colOffset = 0;
              return line.tokens.map((t, i) => {
                const colEnd = colOffset + t.value.length;
                const { match, current } = isInMatch(line.lineNumber - 1, colOffset, colEnd);
                colOffset = colEnd;
                if (!match) return <span key={i} className={`token-${t.type}`}>{t.value}</span>;
                return (
                  <mark
                    key={i}
                    style={{
                      background: current ? 'var(--find-current, #e6a817)' : 'var(--find-match, #ffff0033)',
                      color: current ? 'var(--find-current-text, #000)' : 'inherit',
                      borderRadius: 2,
                      padding: '0 1px',
                    }}
                  >
                    {t.value}
                  </mark>
                );
              });
            })()}
          </span>
        </div>
      ))}
    </pre>
  );
}

export function EditorView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as EditorData;
  const findActive = data.findMode && data.findQuery;
  const findLabel = data.findMode
    ? `find [on] ${data.findCount && data.findCount > 0 ? `${(data.findIndex ?? 0) + 1}/${data.findCount}` : 'no matches'}`
    : null;

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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>{data.path}</span>
        {findLabel && (
          <span style={{
            color: 'var(--find-label, #e6a817)',
            fontWeight: 600,
          }}>
            {findLabel}
          </span>
        )}
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg-primary)',
      }}>
        {findActive
          ? renderWithFindHighlights(
              data.content,
              data.path,
              data.findQuery!,
              data.findIndex ?? 0,
            )
          : <SyntaxHighlight code={data.content} path={data.path} />
        }
      </div>
    </div>
  );
}
