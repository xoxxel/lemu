import { useState, useSyncExternalStore } from 'react';
import { getRuntime } from '../core/runtime/instance';
import type { AiGeneratedPatch } from '../core/coder/session';

interface AiPanelProps {
  state: Record<string, unknown>;
}

function subscribeToSession(callback: () => void): () => void {
  const timer = setInterval(callback, 200);
  return () => clearInterval(timer);
}

function getSnapshot(): number {
  const session = getRuntime().aiSessions.activeSession;
  if (!session) return 0;
  return session.timestamp + session.acceptedCount + session.rejectedCount + session.pendingCount;
}

export function AiPanel({ state: _state }: AiPanelProps) {
  const [selectedPatchIndex, setSelectedPatchIndex] = useState(0);
  const _tick = useSyncExternalStore(subscribeToSession, getSnapshot);

  const runtime = getRuntime();
  const session = runtime.aiSessions.activeSession;

  if (!session) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-header">AI Session</div>
        <div className="ai-panel-body">
          <div className="ai-panel-idle">
            No active AI session. Use <kbd>/coder</kbd> to start one.
          </div>
        </div>
      </div>
    );
  }

  const patches = session.generatedPatches;
  const currentPatch = patches[selectedPatchIndex];

  const goNext = () => {
    if (selectedPatchIndex < patches.length - 1) {
      setSelectedPatchIndex(selectedPatchIndex + 1);
    }
  };

  const goPrev = () => {
    if (selectedPatchIndex > 0) {
      setSelectedPatchIndex(selectedPatchIndex - 1);
    }
  };

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
          <span className={`ai-state-pending`}>{session.pendingCount} pending</span>
          <span className={`ai-state-accepted`}>{session.acceptedCount} accepted</span>
          <span className={`ai-state-rejected`}>{session.rejectedCount} rejected</span>
        </div>

        {patches.length > 0 && (
          <>
            <div className="ai-panel-patch-nav">
              <button className="ai-nav-btn" onClick={goPrev} disabled={selectedPatchIndex === 0}>
                &larr;
              </button>
              <span className="ai-nav-label">
                Patch {selectedPatchIndex + 1} / {patches.length}
              </span>
              <button className="ai-nav-btn" onClick={goNext} disabled={selectedPatchIndex >= patches.length - 1}>
                &rarr;
              </button>
            </div>

            {currentPatch && <PatchView patch={currentPatch} />}
          </>
        )}
      </div>
    </div>
  );
}

function PatchView({ patch }: { patch: AiGeneratedPatch }) {
  const p = patch.patch;
  const state = patch.state;
  const stateClass = `ai-patch-state-${state}`;

  return (
    <div className="ai-patch-view">
      <div className="ai-patch-header">
        <span className={stateClass}>{state}</span>
        <span className="ai-patch-id">{patch.id}</span>
        {patch.dependsOn && patch.dependsOn.length > 0 && (
          <span className="ai-patch-deps">depends on: {patch.dependsOn.join(', ')}</span>
        )}
      </div>
      {patch.reason && <div className="ai-patch-reason">{patch.reason}</div>}
      <div className="ai-patch-range">
        lines {p.range.start}-{p.range.end}
        {p.oldText ? ` (${p.oldText.length} chars)` : ' (insertion)'}
      </div>
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
