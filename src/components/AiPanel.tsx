import { useState, useSyncExternalStore, useRef, useCallback, useEffect } from 'react';
import { getRuntime } from '../core/runtime/instance';
import type { AiGeneratedPatch } from '../core/coder/session';
import { Typewriter } from './Typewriter';

interface AiPanelProps {
  state: Record<string, unknown>;
}

function subscribe(cb: () => void): () => void {
  const id = setInterval(cb, 200);
  return () => clearInterval(id);
}

function getTick(): number {
  const r = getRuntime();
  const s = r.aiSessions.activeSession;
  return s ? s.timestamp + s.acceptedCount + s.pendingCount + s.rejectedCount : Date.now();
}

function patchSummary(patch: { range: { start: number; end: number }; oldText: string; newText: string }): string {
  const oldLen = patch.oldText ? patch.oldText.split('\n').length : 0;
  const newLen = patch.newText ? patch.newText.split('\n').length : 0;
  const changes = Math.max(oldLen, newLen);
  const plural = changes !== 1 ? 's' : '';
  return `${changes} change${plural} · lines ${patch.range.start}-${patch.range.end}`;
}

export function AiPanel({ state: _state }: AiPanelProps) {
  const _tick = useSyncExternalStore(subscribe, getTick);
  const runtime = getRuntime();
  const appCtx = runtime.getContext();

  const session = runtime.aiSessions.activeSession;
  const aiMode = appCtx.get<boolean>('edit:ai:active') ?? false;
  const messages = appCtx.get<Array<{ role: string; content: string; patches?: unknown[] }>>('edit:ai:messages') ?? [];
  const patches = appCtx.get<Array<{ range: { start: number; end: number }; oldText: string; newText: string; state?: string }>>('edit:ai:patches') ?? [];

  /* ── thinking state: AI is processing when the last message is from user ── */
  const thinking = aiMode && messages.length > 0 && messages[messages.length - 1].role === 'user';

  /* ── typewriter: track which assistant messages have finished typing ── */
  const [completedSet, setCompletedSet] = useState<Set<number>>(() => new Set());
  const completedRef = useRef(completedSet);
  completedRef.current = completedSet;

  const handleTypewriterComplete = useCallback((msgIndex: number) => {
    const next = new Set(completedRef.current);
    next.add(msgIndex);
    setCompletedSet(next);
  }, []);

  /* ── auto-scroll ── */
  const bodyRef = useRef<HTMLDivElement>(null);
  const prevMsgLenRef = useRef(0);

  const scrollSmooth = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  const scrollInstant = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  /* smooth-scroll when a new message appears */
  useEffect(() => {
    if (messages.length > prevMsgLenRef.current) {
      prevMsgLenRef.current = messages.length;
      scrollSmooth();
    }
  }, [messages.length, scrollSmooth]);

  /* If no session and no AI mode, show idle */
  if (!session && !aiMode) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title">AI</span>
        </div>
        <div className="ai-panel-body">
          <div className="ai-panel-idle">
            AI mode inactive.<br />Use <kbd>/edit ai on</kbd> or <kbd>/coder</kbd>.
          </div>
        </div>
      </div>
    );
  }

  /* AI mode: conversation view */
  if (aiMode && !session) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-header">
          <span className="ai-panel-title">AI Mode</span>
          <span className="ai-panel-file">{runtime.editorContext.path}</span>
          <button className="ai-panel-close-btn" onClick={() => {
            runtime.ownership.release('edit');
            appCtx.set('edit:ai:active', false);
            appCtx.set('edit:ai:messages', []);
            appCtx.set('edit:ai:patches', []);
            appCtx.remove('edit:ai:baseDocument');
            appCtx.set('action:suffix:ai', '[off]');
          }}>&times;</button>
        </div>
        <div ref={bodyRef} className="ai-panel-body">
          {messages.length === 0 && (
            <div className="ai-panel-idle">
              Type a prompt in the input bar to generate edits.
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
              <div className="ai-msg-header">{msg.role === 'user' ? 'You' : 'AI'}</div>
              <div className="ai-msg-content">
                {msg.role === 'assistant' && i === messages.length - 1 && msg.content && !completedSet.has(i) ? (
                  <Typewriter text={msg.content} speed={18} onComplete={() => handleTypewriterComplete(i)} onTick={scrollInstant} />
                ) : (
                  msg.content
                )}
              </div>
              {completedSet.has(i) && msg.patches && Array.isArray(msg.patches) && msg.patches.length > 0 && (
                <div className="ai-msg-patches">
                  {(msg.patches as unknown[]).map((p: unknown, j) => {
                    const patch = p as { range: { start: number; end: number }; oldText: string; newText: string };
                    const globalIdx = patches.findIndex(pp => pp.range.start === patch.range.start && pp.range.end === patch.range.end);
                    const idx = globalIdx >= 0 ? globalIdx + 1 : j + 1;
                    const state = globalIdx >= 0 ? patches[globalIdx].state : 'pending';
                    return (
                      <PatchBlockMini key={j} index={idx} patch={patch} state={state || 'pending'} />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {thinking && <div className="lemu-thinking">thinking</div>}
        </div>
        <div className="ai-panel-footer">
          <span className="ai-panel-hint">Prompts via input bar &bull; <kbd>&gt;accept n</kbd> &bull; <kbd>&gt;reject n</kbd></span>
        </div>
      </div>
    );
  }

  /* Existing AISession view (from /coder) */
  return <SessionView session={session!} />;
}

function PatchBlockMini({ index, patch, state: st }: { index: number; patch: { range: { start: number; end: number }; oldText: string; newText: string }; state: string }) {
  const [expanded, setExpanded] = useState(false);
  const stateClass = `ai-patch-state-${st}`;
  const summary = patchSummary(patch);

  return (
    <div className="ai-patch-view ai-patch-view-mini" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
      <div className="ai-patch-header">
        <span className={stateClass}>[{index}] {st}</span>
        <span className="ai-patch-range" style={{ flex: 1, marginLeft: 8 }}>{summary}</span>
        <span style={{ color: 'var(--lemu-text-dim)', fontSize: 10 }}>{expanded ? '−' : '+'}</span>
      </div>
      {expanded && (
        <>
          {patch.oldText && <pre className="ai-patch-diff-remove">{patch.oldText}</pre>}
          {patch.newText && <pre className="ai-patch-diff-add">{patch.newText}</pre>}
        </>
      )}
    </div>
  );
}

function SessionView({ session }: { session: import('../core/coder/session').AISession }) {
  const [selectedPatchIndex, setSelectedPatchIndex] = useState(0);
  const patches = session.generatedPatches;
  const currentPatch = patches[selectedPatchIndex];

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-title">AI Session</span>
        <span className="ai-panel-file">{session.filePath}</span>
      </div>
      <div className="ai-panel-body">
        <div className="ai-panel-instructions">
          <div className="ai-panel-label">Instructions</div>
          <div className="ai-panel-text">{session.instructions}</div>
        </div>
        <div className="ai-panel-summary">
          <span className="ai-state-pending">{session.pendingCount} pending</span>
          <span className="ai-state-accepted">{session.acceptedCount} accepted</span>
          <span className="ai-state-rejected">{session.rejectedCount} rejected</span>
        </div>
        {patches.length > 0 && (
          <>
            <div className="ai-panel-patch-nav">
              <button className="ai-nav-btn" onClick={() => setSelectedPatchIndex(Math.max(0, selectedPatchIndex - 1))} disabled={selectedPatchIndex === 0}>&larr;</button>
              <span className="ai-nav-label">Patch {selectedPatchIndex + 1} / {patches.length}</span>
              <button className="ai-nav-btn" onClick={() => setSelectedPatchIndex(Math.min(patches.length - 1, selectedPatchIndex + 1))} disabled={selectedPatchIndex >= patches.length - 1}>&rarr;</button>
            </div>
            {currentPatch && <FullPatchView patch={currentPatch} />}
          </>
        )}
      </div>
    </div>
  );
}

function FullPatchView({ patch }: { patch: AiGeneratedPatch }) {
  const p = patch.patch;
  const state = patch.state;
  return (
    <div className="ai-patch-view">
      <div className="ai-patch-header">
        <span className={`ai-patch-state-${state}`}>{state}</span>
        <span className="ai-patch-id">{patch.id}</span>
      </div>
      {patch.reason && <div className="ai-patch-reason">{patch.reason}</div>}
      <div className="ai-patch-range">offset {p.range.start}-{p.range.end}</div>
      {p.oldText && (
        <div className="ai-patch-diff">
          <div className="ai-patch-diff-remove">
            <div className="ai-patch-diff-label">- removed</div>
            <pre>{p.oldText}</pre>
          </div>
        </div>
      )}
      {p.newText && (
        <div className="ai-patch-diff">
          <div className="ai-patch-diff-add">
            <div className="ai-patch-diff-label">+ added</div>
            <pre>{p.newText}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
