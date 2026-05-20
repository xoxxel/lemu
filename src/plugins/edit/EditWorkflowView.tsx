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

  const [renderTick, setRenderTick] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [showDiff, setShowDiff] = useState(true);
  const [cmdInput, setCmdInput] = useState('');
  const [editingRange, setEditingRange] = useState<Range | null>(session.activeRange);
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const rangeMountRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

  const rerender = useCallback(() => setRenderTick(t => t + 1), []);

  /* ── sync from parent state prop ── */
  useEffect(() => {
    if (session.originalContent !== originalContent) {
      sessionRef.current = new CMEditorSession({ originalContent, initialContent });
      setEditingRange(null);
      rerender();
    }
  }, [originalContent, initialContent]);

  /* ── pendingFocus bridge (main bar >10) ── */
  const [focusSeq, setFocusSeq] = useState(0);
  useEffect(() => {
    if (pendingFocus.value) {
      const range = pendingFocus.value;
      pendingFocus.value = null;
      const clamped = clampRange(range, session.lineCount);
      session.setActiveRange(clamped);
      setEditingRange(clamped);
      setEditBufferFromRange(clamped);
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

    const view = session.mountRangeView(rangeMountRef.current);
    if (!view) {
      setEditingRange(null);
      return;
    }

    session.onChange(() => rerender());
    session.onCommit((_content: string) => {
      const op = session.commitRange();
      setStatusMsg(op ? 'Edit committed.' : 'No changes to commit.');
      setEditingRange(null);
      rerender();
    });
    session.onCancel(() => {
      session.cancelRange();
      setStatusMsg('Cancelled.');
      setEditingRange(null);
      rerender();
    });

    view.focus();

    return () => {
      if (session.activeRange) {
        session.destroy();
        session.setActiveRange(null);
      }
    };
  }, [editingRange]);

  /* ── scroll helper ── */
  const scrollToLine = useCallback((line: number) => {
    const el = codeScrollRef.current;
    if (!el) return;
    el.scrollTop = Math.max(0, (line - 1) * LINE_HEIGHT - el.clientHeight / 3);
  }, []);

  /* ── set edit buffer from range ── */
  const setEditBufferFromRange = useCallback((range: Range) => {
    const runtime = getRuntime();
    runtime.getContext().set('edit:rangeContent', session.getRangeContent(range));
  }, [session]);

  /* ── cmd input ── */
  const handleCmdSubmit = useCallback(() => {
    const trimmed = cmdInput.trim();
    setCmdInput('');
    if (!trimmed) return;

    if (editingRange && (trimmed === '<<' || trimmed === '>>')) {
      if (trimmed === '<<') {
        const op = session.commitRange();
        setStatusMsg(op ? 'Edit committed.' : 'No changes to commit.');
      } else {
        session.cancelRange();
        setStatusMsg('Cancelled.');
      }
      setEditingRange(null);
      rerender();
      return;
    }

    const parsed = parseRangeInput(trimmed);
    if (parsed) {
      const clamped = clampRange(parsed, session.lineCount);
      session.setActiveRange(clamped);
      setEditingRange(clamped);
      setEditBufferFromRange(clamped);
      scrollToLine(clamped.start);
      setStatusMsg(`Editing lines ${clamped.start}-${clamped.end}`);
      rerender();
      return;
    }

    setStatusMsg(`Unknown: "${trimmed}"`);
  }, [cmdInput, session, editingRange, scrollToLine, setEditBufferFromRange, rerender]);

  const handleCmdKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCmdSubmit();
    else if (e.key === 'Escape' && editingRange) {
      session.cancelRange();
      setEditingRange(null);
      setStatusMsg('Cancelled.');
      rerender();
    }
  }, [handleCmdSubmit, editingRange, session, rerender]);

  /* ── workflow handlers ── */
  const handlePropose = async () => {
    const runtime = getRuntime();
    const pipeline = runtime.getEditPipeline();
    const suggestion = await pipeline.propose({
      filePath: (state as Record<string, string>).path ?? '',
      originalContent: session.originalContent,
      proposedContent: session.content,
      source: 'user',
    });
    runtime.getContext().set('edit:pending:active', suggestion.id);
    setStatusMsg(`Proposed — ${suggestion.diff.slice(0, 200)}${suggestion.diff.length > 200 ? '...' : ''}`);
    rerender();
  };

  const handleApply = async () => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const suggestionId = appCtx.get<string>('edit:pending:active');
    if (!suggestionId) { setStatusMsg('No pending proposal.'); return; }
    const result = await runtime.getEditPipeline().approve(suggestionId);
    if (!result) { setStatusMsg('Suggestion not found.'); return; }
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: result.filePath, content: result.proposedContent }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      setStatusMsg(`Write failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    appCtx.remove('edit:pending:active');
    setStatusMsg(`Applied to ${result.filePath}`);
    rerender();
  };

  const handleReject = () => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const suggestionId = appCtx.get<string>('edit:pending:active');
    if (suggestionId) {
      runtime.getEditPipeline().reject(suggestionId, 'Rejected in view');
      appCtx.remove('edit:pending:active');
    }
    setStatusMsg('Proposal rejected.');
    rerender();
  };

  const handleRevert = () => {
    const runtime = getRuntime();
    runtime.getContext().remove('edit:pending:active');
    session.reset();
    setEditingRange(null);
    setStatusMsg('Reverted to original.');
    rerender();
  };

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
  const activeBtn: React.CSSProperties = { ...btnStyle, background: 'var(--accent)', color: '#fff' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* header */}
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

      {/* toolbar */}
      <div style={{
        padding: '4px 8px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0,
      }}>
        <button style={hasChanges ? activeBtn : btnStyle} onClick={handlePropose}>Propose</button>
        <button style={btnStyle} onClick={handleApply}>Apply</button>
        <button style={btnStyle} onClick={handleReject}>Reject</button>
        <button style={btnStyle} onClick={handleRevert}>Revert</button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={() => setShowDiff(v => !v)}>
          {showDiff ? 'Editor' : 'Diff'}
        </button>
        {statusMsg && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{statusMsg}</span>}
      </div>

      {/* main area: code + diff */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div ref={codeScrollRef} style={{
          flex: showDiff ? '0 0 70%' : '1 1 100%', overflow: 'auto',
          background: 'var(--bg-primary)', position: 'relative',
        }}>
          {editingRange ? (
            <RangeCodeView
              lineMetadata={lineMetadata}
              range={editingRange}
              rangeMountRef={rangeMountRef}
            />
          ) : (
            <ReadOnlyCodeView lineMetadata={lineMetadata} />
          )}
        </div>

        {/* diff panel */}
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

      {/* command bar */}
      <div style={{
        borderTop: '0.5px solid var(--border)', display: 'flex', alignItems: 'center',
        background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <span style={{ padding: '0 0 0 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{'>'}</span>
        <input
          type="text"
          value={cmdInput}
          onChange={e => setCmdInput(e.target.value)}
          onKeyDown={handleCmdKey}
          placeholder={editingRange ? '<< to commit · >> or Esc to cancel' : '10 to focus line · 10 15 to focus range'}
          style={{
            flex: 1, border: 'none', outline: 'none', padding: '10px 12px',
            background: 'transparent', color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)', fontSize: 13,
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/* ─── Read-only code view (line metadata aware) ─── */

function ReadOnlyCodeView({ lineMetadata }: { lineMetadata: LineState[] }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {lineMetadata.map(ls => (
        <LineRow key={ls.lineNumber} state={ls} />
      ))}
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

/* ─── Single line row with gutter indicator ─── */

function LineRow({ state }: { state: LineState }) {
  let gutterColor = 'transparent';
  let background = 'transparent';

  if (state.isModified) {
    gutterColor = '#ff9800';
    background = 'rgba(255, 152, 0, 0.04)';
  } else if (state.isInserted) {
    gutterColor = '#00c853';
    background = 'rgba(0, 200, 83, 0.04)';
  } else if (state.isDeleted) {
    gutterColor = '#ff1744';
    background = 'rgba(255, 23, 68, 0.04)';
  }

  return (
    <div style={{ display: 'flex', background }}>
      <div style={{ width: 3, flexShrink: 0, background: gutterColor }} />
      <span style={{
        display: 'inline-block', width: 45, textAlign: 'right', paddingRight: 12,
        color: state.isActiveRange ? '#ff9800' : 'var(--text-muted)',
        userSelect: 'none', fontSize: 11, lineHeight: '20px', flexShrink: 0,
      }}>
        {state.lineNumber}
      </span>
      <span style={{
        whiteSpace: 'pre', fontFamily: 'var(--font-mono)', fontSize: 13,
        lineHeight: '20px', color: 'var(--text-primary)',
      }}>
        {state.content || ' '}
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
