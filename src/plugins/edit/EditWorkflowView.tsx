import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CMEditorSession } from '../../core/editor';
import type { LineState } from '../../core/editor/line-metadata';
import type { Range } from '../../core/editor/document';
import { getRuntime } from '../../core/runtime/instance';
import { pendingFocus } from './actions';

const LINE_HEIGHT = 20;

function clampRange(range: Range, maxLines: number): Range {
  return {
    start: Math.max(1, Math.min(range.start, maxLines)),
    end: Math.max(1, Math.min(range.end, maxLines)),
  };
}

export function EditWorkflowView({ state }: { state: Record<string, unknown> }) {
  const { originalContent, currentContent: initialContent } = state as {
    originalContent: string;
    currentContent: string;
  };

  const sessionRef = useRef<CMEditorSession>(new CMEditorSession({
    originalContent,
    initialContent: initialContent ?? originalContent,
  }));

  const session = sessionRef.current;
  const appCtx = getRuntime().getContext();
  appCtx.set('edit:session', session);

  const [renderTick, setRenderTick] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [showDiff, setShowDiff] = useState(() => appCtx.get<boolean>('edit:diffVisible') ?? true);
  const [editingRange, setEditingRange] = useState<Range | null>(session.activeRange);
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const rangeMountRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const rerender = useCallback(() => setRenderTick(t => t + 1), []);

  const lastSyncedContentRef = useRef(initialContent);

  /* ── sync from parent state prop (handles external content updates from replace action) ── */
  useEffect(() => {
    const s = sessionRef.current;
    if (s.originalContent !== originalContent || initialContent !== lastSyncedContentRef.current) {
      const newSession = new CMEditorSession({ originalContent, initialContent: initialContent ?? originalContent });
      sessionRef.current = newSession;
      appCtx.set('edit:session', newSession);
      lastSyncedContentRef.current = initialContent;
      setEditingRange(null);
      rerender();
    }
  }, [originalContent, initialContent]);

  /* ── pendingFocus bridge (main bar >10) ── */
  const [focusSeq, setFocusSeq] = useState(0);
  useEffect(() => {
    if (pendingFocus.value) {
      const s = sessionRef.current;
      const range = pendingFocus.value;
      pendingFocus.value = null;
      const clamped = clampRange(range, s.lineCount);
      s.setActiveRange(clamped);
      setEditingRange(clamped);
      scrollToLine(clamped.start);
      rerender();
    }
  }, [focusSeq]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pendingFocus.seq !== focusSeq) setFocusSeq(pendingFocus.seq);
    }, 100);
    return () => clearInterval(id);
  }, [focusSeq]);

  /* ── CM6 range view mount ── */
  useEffect(() => {
    if (!editingRange || !rangeMountRef.current) return;
    const s = sessionRef.current;
    const view = s.mountRangeView(rangeMountRef.current);
    if (!view) { setEditingRange(null); return; }
    s.onChange(() => rerender());
    s.onCommit(() => {
      const op = s.commitRange();
      setStatusMsg(op ? 'Edit committed.' : 'No changes to commit.');
      setEditingRange(null);
      rerender();
    });
    s.onCancel(() => {
      s.cancelRange();
      setStatusMsg('Cancelled.');
      setEditingRange(null);
      rerender();
    });
    view.focus();
    return () => {
      if (s.activeRange) { s.destroy(); s.setActiveRange(null); }
    };
  }, [editingRange]);

  /* ── diff visibility: subscribe ── */
  useEffect(() => {
    appCtx.set('edit:diffVisible', showDiff);
    appCtx.set('action:suffix:diff', showDiff ? '[on]' : '[off]');
    if (appCtx.get<string>('action:suffix:find') === undefined) {
      appCtx.set('action:suffix:find', '[off]');
    }
    if (appCtx.get<string>('action:suffix:ai') === undefined) {
      appCtx.set('action:suffix:ai', '[off]');
    }
    if (appCtx.get<boolean>('edit:search:mode') === undefined) {
      appCtx.set('edit:search:mode', false);
    }
    if (appCtx.get<boolean>('edit:ai:active') === undefined) {
      appCtx.set('edit:ai:active', false);
    }
  }, []);
  useEffect(() => {
    return appCtx.onChange('edit:diffVisible', (_k, v) => { setShowDiff(v !== false); });
  }, []);

  /* no internal command input — main app input drives commands/search */

  /* ── scroll helper ── */
  const scrollToLine = useCallback((line: number) => {
    const el = codeScrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (line - 1) * LINE_HEIGHT - el.clientHeight / 3);
  }, []);

  /* ── replace event messages (auto-dismiss) ── */
  useEffect(() => {
    const timer = setTimeout(() => setStatusMsg(''), 4000);
    return () => clearTimeout(timer);
  }, [statusMsg]);

  useEffect(() => {
    return appCtx.onChange('edit:replace:event', (_k, v) => {
      if (v && typeof v === 'object') {
        const ev = v as { type: string; text: string };
        setStatusMsg(ev.text);
        rerender();
      }
    });
  }, []);

  /* ── search: subscribe to appContext navigation/execute ── */
  useEffect(() => {
    const us = [
      appCtx.onChange('edit:search:navigate', (_k, v) => {
        const s = sessionRef.current;
        if (v === 'next') s.nextMatch();
        else if (v === 'prev') s.prevMatch();
        const current = s.searchSession.matches[s.searchSession.matchIndex];
        if (current) scrollToLine(current.line);
        rerender();
      }),
      appCtx.onChange('edit:search:execute', (_k, v) => {
        if (typeof v === 'string') {
          const s = sessionRef.current;
          if (s.activeRange) {
            s.find(v, s.activeRange);
          } else {
            s.find(v);
          }
          rerender();
        }
      }),
      appCtx.onChange('edit:replace:refreshTick', () => {
        rerender();
      }),
      appCtx.onChange('edit:search:mode', (_k, v) => {
        if (v === true) {
          rerender();
          return;
        }
        sessionRef.current.clearSearch();
        rerender();
      }),
      appCtx.onChange('edit:ai:active', (_k, v) => {
        if (v === false) {
          // Clear AI messages and patches when exiting AI mode
          appCtx.set('edit:ai:messages', []);
          appCtx.set('edit:ai:patches', []);
        }
        rerender();
      }),
    ];
    return () => us.forEach(u => u());
  }, [scrollToLine]);

  /* command handling moved to main app input via App.tsx; no internal input here */

  /* ── derived data ── */
  const lineMetadata = useMemo(() => session.getLineMetadata(), [renderTick]);
  const diffResult = useMemo(() => session.getDiff(), [renderTick]);
  const hasChanges = session.content !== session.originalContent;

  /* ── styles ── */
  const btnStyle: React.CSSProperties = {
    padding: '4px 12px', border: '0.5px solid var(--border)', borderRadius: 4,
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    cursor: 'pointer', fontSize: 12,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={{
        padding: '8px 16px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-secondary)', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          {(state as Record<string, string>).path ?? ''}
        </span>
        {editingRange && (
          <span style={{ fontSize: 11, color: '#ff9800' }}>
            L{editingRange.start}{editingRange.end !== editingRange.start ? `-${editingRange.end}` : ''}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: hasChanges ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11 }}>
          {hasChanges ? 'modified' : 'unchanged'}
        </span>
      </header>

      <div style={{
        padding: '4px 8px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0,
      }}>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={() => {
          const next = !showDiff;
          setShowDiff(next);
          appCtx.set('edit:diffVisible', next);
          appCtx.set('action:suffix:diff', next ? '[on]' : '[off]');
        }}>
          {showDiff ? 'Editor' : 'Diff'}
        </button>
        {statusMsg && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{statusMsg}</span>}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div ref={codeScrollRef} style={{
          flex: showDiff ? '0 0 70%' : '1 1 100%', overflow: 'auto',
          background: 'var(--bg-primary)', position: 'relative',
        }}>
          {editingRange ? (
            <RangeCodeView lineMetadata={lineMetadata} range={editingRange} rangeMountRef={rangeMountRef} />
          ) : (
            <ReadOnlyCodeView lineMetadata={lineMetadata} />
          )}
        </div>

        {showDiff && (
          <div style={{
            flex: '0 0 30%', overflow: 'auto', padding: 8,
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5,
            background: 'var(--bg-primary)',
          }}>
            {!hasChanges ? (
              <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>
                No changes — edit the content on the left
              </div>
            ) : (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {diffResult.hunks.map((hunk, i) => (
                  <div key={i}>
                    <div style={{ color: 'var(--text-muted)', padding: '2px 0', fontSize: 11 }}>
                      @@ -{hunk.origStart},{hunk.origCount} +{hunk.newStart},{hunk.newCount} @@
                    </div>
                    {hunk.lines.map((line, j) => (
                      <div key={j} style={{
                        background: line.type === 'added' ? 'rgba(0,200,83,0.1)' : line.type === 'removed' ? 'rgba(255,23,68,0.1)' : 'transparent',
                        color: line.type === 'added' ? '#00c853' : line.type === 'removed' ? '#ff1744' : 'var(--text-primary)',
                        padding: '0 8px',
                      }}>
                        {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} {line.content}
                      </div>
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

/* ─── Read-only code view ─── */

function ReadOnlyCodeView({ lineMetadata }: { lineMetadata: LineState[] }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {lineMetadata.map(ls => <LineRow key={ls.lineNumber} state={ls} />)}
    </div>
  );
}

/* ─── Range code view (CM6 + line metadata) ─── */

function RangeCodeView({ lineMetadata, range, rangeMountRef }: {
  lineMetadata: LineState[];
  range: Range;
  rangeMountRef: React.RefObject<HTMLDivElement>;
}) {
  const before = lineMetadata.filter(ls => ls.lineNumber < range.start);
  const after = lineMetadata.filter(ls => ls.lineNumber > range.end);

  return (
    <div style={{ padding: '8px 0' }}>
      {before.map(ls => <LineRow key={ls.lineNumber} state={ls} />)}
      <div style={{ display: 'flex' }}>
        <div style={{
          textAlign: 'right', width: 48, paddingRight: 12, userSelect: 'none',
          fontSize: 11, color: 'var(--text-muted)', lineHeight: '20px', flexShrink: 0,
        }}>
          {Array.from({ length: range.end - range.start + 1 }, (_, i) => (
            <div key={range.start + i}>{range.start + i}</div>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 40, padding: 6 }}>
          <div ref={rangeMountRef} style={{ width: '100%', minHeight: 28, borderRadius: 6, background: 'rgba(255,152,0,0.02)', boxShadow: 'inset 0 0 0 1px rgba(255,152,0,0.03)' }} />
        </div>
      </div>
      {after.map(ls => <LineRow key={ls.lineNumber} state={ls} />)}
    </div>
  );
}

/* ─── Single line row with gutter indicator + text-level search highlights ─── */

function renderHighlightedContent(content: string, highlights: { start: number; end: number }[]): React.ReactNode[] {
  if (!highlights || highlights.length === 0 || !content) {
    return [content || ' '];
  }

  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const segments: React.ReactNode[] = [];
  let pos = 0;

  for (const h of sorted) {
    if (h.start > content.length || h.end > content.length) continue;
    if (h.start < pos) continue;

    if (h.start > pos) {
      segments.push(<span key={`t-${pos}`}>{content.slice(pos, h.start)}</span>);
    }

    segments.push(
      <mark key={`m-${h.start}`} style={{
        background: 'rgba(255, 200, 0, 0.4)',
        color: 'inherit',
        borderRadius: 2,
        padding: '0 1px',
      }}>
        {content.slice(h.start, h.end)}
      </mark>
    );

    pos = h.end;
  }

  if (pos < content.length) {
    segments.push(<span key={`t-${pos}`}>{content.slice(pos)}</span>);
  }

  return segments;
}

function LineRow({ state }: { state: LineState }) {
  let gutterColor = 'transparent';
  let background = 'transparent';

  if (state.isActiveSearchMatch) {
    gutterColor = '#e6a817';
    background = 'rgba(255, 200, 0, 0.08)';
  } else if (state.isSearchMatch) {
    gutterColor = '#e6a817';
    background = 'rgba(255, 200, 0, 0.04)';
  } else if (state.isModified) {
    gutterColor = '#ff9800';
    background = 'rgba(255, 152, 0, 0.04)';
  } else if (state.isInserted) {
    gutterColor = '#00c853';
    background = 'rgba(0, 200, 83, 0.04)';
  } else if (state.isDeleted) {
    gutterColor = '#ff1744';
    background = 'rgba(255, 23, 68, 0.04)';
  }

  const content = state.searchHighlights?.length
    ? renderHighlightedContent(state.content, state.searchHighlights)
    : (state.content || ' ');

  return (
    <div style={{ display: 'flex', background }}>
      <div style={{ width: 3, flexShrink: 0, background: gutterColor }} />
      <span style={{
        display: 'inline-block', width: 45, textAlign: 'right', paddingRight: 12,
        color: state.isActiveSearchMatch ? '#e6a817' : state.isActiveRange ? '#ff9800' : 'var(--text-muted)',
        userSelect: 'none', fontSize: 11, lineHeight: '20px', flexShrink: 0,
      }}>
        {state.lineNumber}
      </span>
      <span style={{
        whiteSpace: 'pre', fontFamily: 'var(--font-mono)', fontSize: 13,
        lineHeight: '20px', color: 'var(--text-primary)',
      }}>
        {state.isActiveSearchMatch ? <>{content}<span style={{ color: '#e6a817' }}>  {'←'}</span></> : content}
      </span>
    </div>
  );
}

/* ─── helpers ─── */

function parseRangeInput(input: string): Range | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const single = trimmed.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { start: n, end: n };
  }
  const pair = trimmed.match(/^(\d+)\s+(\d+)$/);
  if (pair) {
    const s = parseInt(pair[1], 10);
    const e = parseInt(pair[2], 10);
    return { start: Math.min(s, e), end: Math.max(s, e) };
  }
  return null;
}
