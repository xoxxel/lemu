import { useState } from 'react';
import { computeDiff, formatDiff } from '../../core/orchestrator/diff-engine';
import { getRuntime } from '../../core/runtime/instance';

interface EditWorkflowState {
  path: string;
  originalContent: string;
  currentContent: string;
}

export function EditWorkflowView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as EditWorkflowState;
  const [currentContent, setCurrentContent] = useState(data.currentContent);
  const [showDiff, setShowDiff] = useState(true);
  const [status, setStatus] = useState<'idle' | 'pending' | 'applied' | 'rejected'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const hasChanges = currentContent !== data.originalContent;

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
    setStatus('idle');
    setStatusMsg('Reverted to original.');
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
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
        <span style={{
          marginLeft: 'auto',
          color: hasChanges ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 11,
        }}>
          {hasChanges ? 'modified' : 'unchanged'}
        </span>
      </div>

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
        <button style={btnStyle} onClick={() => setShowDiff(!showDiff)}>
          {showDiff ? 'Editor' : 'Diff'}
        </button>
        {statusMsg && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
            {statusMsg}
          </span>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: showDiff ? 1 : 1,
          overflow: 'auto',
          display: showDiff ? 'flex' : 'none',
          borderRight: showDiff ? '0.5px solid var(--border)' : 'none',
        }}>
          <textarea
            value={currentContent}
            onChange={(e) => { setCurrentContent(e.target.value); setStatus('idle'); }}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              resize: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.5,
              padding: 12,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
              tabSize: 2,
            }}
            spellCheck={false}
          />
        </div>

        <div style={{
          flex: 1,
          overflow: 'auto',
          display: showDiff ? 'block' : 'none',
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
      </div>
    </div>
  );
}

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
