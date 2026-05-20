import { useState, useCallback, useEffect, useRef } from 'react';
import { computeDiff, formatDiff } from '../../core/orchestrator/diff-engine';
import { getRuntime } from '../../core/runtime/instance';
import { pendingFocus } from './actions';

interface EditWorkflowState {
  path: string;
  originalContent: string;
  currentContent: string;
}

interface ActiveRange {
  start: number;
  end: number;
}

function parseRange(input: string): ActiveRange | null {
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

function clampRange(range: ActiveRange, maxLines: number): ActiveRange {
  return {
    start: Math.max(1, Math.min(range.start, maxLines)),
    end: Math.max(1, Math.min(range.end, maxLines)),
  };
}

const LINE_HEIGHT = 20;

export function EditWorkflowView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as EditWorkflowState;
  const [currentContent, setCurrentContent] = useState(data.currentContent);
  const [showDiff, setShowDiff] = useState(true);
  const [status, setStatus] = useState<'idle' | 'pending' | 'applied' | 'rejected'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeRange, setActiveRange] = useState<ActiveRange | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [cmdInput, setCmdInput] = useState('');
  const codeScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = currentContent.split('\n');
  const hasChanges = currentContent !== data.originalContent;

  useEffect(() => {
    setCurrentContent(data.currentContent);
  }, [data.currentContent]);

  useEffect(() => {
    if (activeRange && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeRange]);

  const scrollToLine = useCallback((line: number) => {
    const el = codeScrollRef.current;
    if (!el) return;
    const top = (line - 1) * LINE_HEIGHT;
    el.scrollTop = Math.max(0, top - el.clientHeight / 3);
  }, []);

  const [focusSeq, setFocusSeq] = useState(0);

  useEffect(() => {
    if (pendingFocus.value) {
      const range = pendingFocus.value;
      pendingFocus.value = null;
      const clamped = clampRange(range, lines.length);
      setActiveRange(clamped);
      setEditBuffer(getRangeContent(currentContent, clamped));
      scrollToLine(clamped.start);
    }
  }, [focusSeq]);

  /* sync pendingFocus seq so the effect above fires */
  useEffect(() => {
    const id = setInterval(() => {
      if (pendingFocus.seq !== focusSeq) {
        setFocusSeq(pendingFocus.seq);
      }
    }, 100);
    return () => clearInterval(id);
  }, [focusSeq]);

  /* ── command input ────────────────────────────── */

  const handleCmdSubmit = useCallback(() => {
    const trimmed = cmdInput.trim();
    setCmdInput('');

    if (!trimmed) return;

    if (activeRange && (trimmed === '<<' || trimmed === '>>')) {
      if (trimmed === '<<') {
        if (editBuffer !== getRangeContent(currentContent, activeRange)) {
          const newContent = replaceRange(currentContent, activeRange, editBuffer);
          setCurrentContent(newContent);
          setStatus('idle');
          setStatusMsg('Edit committed.');
        } else {
          setStatusMsg('No changes to commit.');
        }
      }
      setActiveRange(null);
      setEditBuffer('');
      return;
    }

    const range = parseRange(trimmed);
    if (range) {
      const clamped = clampRange(range, lines.length);
      setActiveRange(clamped);
      const rangeContent = getRangeContent(currentContent, clamped);
      setEditBuffer(rangeContent);
      setStatusMsg(`Editing lines ${clamped.start}-${clamped.end}`);
      scrollToLine(clamped.start);
      return;
    }

    setStatusMsg(`Unknown: "${trimmed}"`);
  }, [cmdInput, currentContent, activeRange, editBuffer, lines.length, scrollToLine]);

  const handleCmdKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCmdSubmit();
      return;
    }
    if (e.key === 'Escape' && activeRange) {
      setActiveRange(null);
      setEditBuffer('');
      setStatusMsg('Cancelled.');
    }
  }, [handleCmdSubmit, activeRange]);

  /* ── textarea edit handler ────────────────────── */

  const handleRangeEdit = useCallback((value: string) => {
    setEditBuffer(value);
  }, []);

  const handleRangeKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setActiveRange(null);
      setEditBuffer('');
      setStatusMsg('Cancelled.');
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (editBuffer !== getRangeContent(currentContent, activeRange!)) {
        const newContent = replaceRange(currentContent, activeRange!, editBuffer);
        setCurrentContent(newContent);
        setStatus('idle');
        setStatusMsg('Edit committed.');
      }
      setActiveRange(null);
      setEditBuffer('');
      e.preventDefault();
    }
  }, [editBuffer, currentContent, activeRange]);

  /* ── workflow handlers ────────────────────────── */

  const handlePropose = async () => {
    const runtime = getRuntime();
    const pipeline = runtime.getEditPipeline();
    const suggestion = await pipeline.propose({
      filePath: data.path,
      originalContent: data.originalContent,
      proposedContent: currentContent,
      source: 'user',
    });
    const appCtx = runtime.getContext();
    appCtx.set('edit:pending:active', suggestion.id);
    setStatus('pending');
    setStatusMsg(`Proposed — ${suggestion.diff.slice(0, 200)}${suggestion.diff.length > 200 ? '...' : ''}`);
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
    setStatus('applied');
    setStatusMsg(`Applied to ${result.filePath}`);
  };

  const handleReject = () => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const suggestionId = appCtx.get<string>('edit:pending:active');
    if (suggestionId) {
      runtime.getEditPipeline().reject(suggestionId, 'Rejected in view');
      appCtx.remove('edit:pending:active');
    }
    setStatus('rejected');
    setStatusMsg('Proposal rejected.');
  };

  const handleRevert = () => {
    const runtime = getRuntime();
    runtime.getContext().remove('edit:pending:active');
    setCurrentContent(data.originalContent);
    setActiveRange(null);
    setEditBuffer('');
    setStatus('idle');
    setStatusMsg('Reverted to original.');
  };

  /* ── styles ───────────────────────────────────── */

  const btnStyle: React.CSSProperties = {
    padding: '4px 12px',
    border: '0.5px solid var(--border)',
    borderRadius: 4,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: 12,
  };

  const activeBtn: React.CSSProperties = { ...btnStyle, background: 'var(--accent)', color: '#fff' };

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    lineHeight: `${LINE_HEIGHT}px`,
  };

  /* ── render ───────────────────────────────────── */

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── header ──────────────────────────────── */}
      <header style={{
        padding: '8px 16px',
        borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-secondary)',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{data.path}</span>
        {activeRange && (
          <span style={{ fontSize: 11, color: '#ff9800' }}>
            L{activeRange.start}{activeRange.end !== activeRange.start ? `-${activeRange.end}` : ''}
          </span>
        )}
        <span style={{
          marginLeft: 'auto',
          color: hasChanges ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 11,
        }}>
          {hasChanges ? 'modified' : 'unchanged'}
        </span>
      </header>

      {/* ── toolbar ──────────────────────────────── */}
      <div style={{
        padding: '4px 8px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <button style={hasChanges && status !== 'pending' ? activeBtn : btnStyle}
          disabled={!hasChanges || status === 'pending'}
          onClick={handlePropose}>
          Propose
        </button>
        <button style={status === 'pending' ? activeBtn : btnStyle}
          disabled={status !== 'pending'}
          onClick={handleApply}>
          Apply
        </button>
        <button style={btnStyle}
          disabled={status !== 'pending'}
          onClick={handleReject}>
          Reject
        </button>
        <button style={btnStyle}
          disabled={!hasChanges}
          onClick={handleRevert}>
          Revert
        </button>
        <div style={{ flex: 1 }} />
        <button style={btnStyle} onClick={() => setShowDiff(v => !v)}>
          {showDiff ? 'Editor' : 'Diff'}
        </button>
        {statusMsg && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            {statusMsg}
          </span>
        )}
      </div>

      {/* ── main area (70/30) ────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* code panel */}
        <div ref={codeScrollRef} style={{
          flex: showDiff ? '0 0 70%' : '1 1 100%',
          overflow: 'auto',
          background: 'var(--bg-primary)',
          position: 'relative',
        }}>
          {activeRange ? (
            <RangeCodeView
              lines={lines}
              range={activeRange}
              editBuffer={editBuffer}
              onEdit={handleRangeEdit}
              onKeyDown={handleRangeKey}
              textareaRef={textareaRef}
            />
          ) : (
            <ReadOnlyCodeView lines={lines} />
          )}
        </div>

        {/* diff panel */}
        {showDiff && (
          <div style={{
            flex: '0 0 30%',
            overflow: 'auto',
            padding: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.5,
            background: 'var(--bg-primary)',
          }}>
            {!hasChanges ? (
              <div style={{ color: 'var(--text-muted)', padding: 16, textAlign: 'center' }}>
                No changes — edit the content on the left
              </div>
            ) : (
              <DiffView original={data.originalContent} current={currentContent} />
            )}
          </div>
        )}
      </div>

      {/* ── command input bar ────────────────────── */}
      <div style={{
        borderTop: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <span style={{
          padding: '0 0 0 12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
        }}>
          {'>'}
        </span>
        <input
          type="text"
          value={cmdInput}
          onChange={e => setCmdInput(e.target.value)}
          onKeyDown={handleCmdKey}
          placeholder={
            activeRange
              ? '<< to commit · >> or Esc to cancel'
              : '10 to focus line · 10 15 to focus range'
          }
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '10px 12px',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

/* ─── Read-only Code View ──────────────────────────── */

function ReadOnlyCodeView({ lines }: { lines: string[] }) {
  return (
    <div style={{ padding: '8px 0' }}>
      {lines.map((line, i) => (
        <LineRow key={i} num={i + 1} content={line} />
      ))}
    </div>
  );
}

/* ─── Range Code View ──────────────────────────────── */

function RangeCodeView({ lines, range, editBuffer, onEdit, onKeyDown, textareaRef }: {
  lines: string[];
  range: ActiveRange;
  editBuffer: string;
  onEdit: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.Ref<HTMLTextAreaElement>;
}) {
  const before = lines.slice(0, range.start - 1);
  const after = lines.slice(range.end);

  return (
    <div style={{ padding: '8px 0' }}>
      {before.map((line, i) => (
        <LineRow key={`b-${i}`} num={i + 1} content={line} />
      ))}
      <div style={{ display: 'flex' }}>
        <div style={{ textAlign: 'right', width: 48, paddingRight: 12, userSelect: 'none', fontSize: 11, color: 'var(--text-muted)', lineHeight: '20px', flexShrink: 0 }}>
          {Array.from({ length: range.end - range.start + 1 }, (_, i) => (
            <div key={i}>{range.start + i}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={editBuffer}
          onChange={e => onEdit(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          rows={range.end - range.start + 1}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: '20px',
            padding: 0,
            background: 'rgba(255, 152, 0, 0.06)',
            color: 'var(--text-primary)',
            tabSize: 2,
            overflow: 'hidden',
          }}
        />
      </div>
      {after.map((line, i) => (
        <LineRow key={`a-${i}`} num={range.end + i + 1} content={line} />
      ))}
    </div>
  );
}

/* ─── Single line row ──────────────────────────────── */

function LineRow({ num, content }: { num: number; content: string }) {
  return (
    <div style={{ display: 'flex' }}>
      <span style={{
        display: 'inline-block',
        width: 48,
        textAlign: 'right',
        paddingRight: 12,
        color: 'var(--text-muted)',
        userSelect: 'none',
        fontSize: 11,
        lineHeight: '20px',
        flexShrink: 0,
      }}>
        {num}
      </span>
      <span style={{
        whiteSpace: 'pre',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: '20px',
        color: 'var(--text-primary)',
      }}>
        {content || ' '}
      </span>
    </div>
  );
}

/* ─── Diff View ────────────────────────────────────── */

function DiffView({ original, current }: { original: string; current: string }) {
  const diff = computeDiff(original, current);

  return (
    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
      {diff.hunks.map((hunk, i) => (
        <div key={i}>
          <div style={{ color: 'var(--text-muted)', padding: '2px 0', fontSize: 11 }}>
            @@ -{hunk.start},{hunk.end} @@
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
  );
}

/* ─── helpers ──────────────────────────────────────── */

function getRangeContent(content: string, range: ActiveRange): string {
  return content.split('\n').slice(range.start - 1, range.end).join('\n');
}

function replaceRange(content: string, range: ActiveRange, replacement: string): string {
  const lines = content.split('\n');
  return [
    ...lines.slice(0, range.start - 1),
    ...(replacement ? replacement.split('\n') : []),
    ...lines.slice(range.end),
  ].join('\n');
}
