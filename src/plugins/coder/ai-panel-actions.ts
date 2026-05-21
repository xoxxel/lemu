import { getRuntime } from '../../core/runtime/instance';
import { eventBus, DomainEventTypes } from '../../core/events';
import { invertPatches, applyPatches } from '../../core/operations/patch';
import type { PluginAction } from '../../core/actions/types';

interface SessionInfoError { error: string; }
interface SessionInfoOk { session: import('../../core/coder/session').AISession; runtime: import('../../core/runtime/index').Runtime; }
type SessionInfo = SessionInfoError | SessionInfoOk;

function getSessionInfo(): SessionInfo {
  const runtime = getRuntime();
  const session = runtime.aiSessions.activeSession;
  if (!session || session.closed) {
    return { error: 'No active AI session.' };
  }
  return { session, runtime };
}



const acceptAction: PluginAction = {
  id: 'accept',
  title: 'Accept Patch',
  description: 'Accept a patch. Usage: >accept, >accept 3, >accept all',
  handler: async (ctx) => {
    const info = getSessionInfo();
    if ('error' in info) return info.error;
    const session = (info as SessionInfoOk).session;
    const query = (ctx.query || '').trim().toLowerCase();

    if (query === 'all') {
      let count = 0;
      for (const p of session.generatedPatches) {
        if (session.getPatchState(p.id) === 'pending') {
          session.acceptPatch(p.id);
          count++;
        }
      }
      return `Accepted ${count} patch(es).`;
    }

    const index = parseInt(query, 10);
    if (!isNaN(index) && index >= 1 && index <= session.generatedPatches.length) {
      const p = session.generatedPatches[index - 1];
      if (session.getPatchState(p.id) !== 'pending') {
        return `Patch ${index} is already ${session.getPatchState(p.id)}.`;
      }
      session.acceptPatch(p.id);
      return `Accepted patch ${index}.`;
    }

    const pending = session.generatedPatches.filter(p => session.getPatchState(p.id) === 'pending');
    if (pending.length === 0) return 'No pending patches to accept.';

    const p = pending[0];
    session.acceptPatch(p.id);
    return `Accepted patch ${session.generatedPatches.indexOf(p) + 1}.`;
  },
};

const rejectAction: PluginAction = {
  id: 'reject',
  title: 'Reject Patch',
  description: 'Reject a patch. Usage: >reject, >reject 3, >reject all',
  handler: async (ctx) => {
    const info = getSessionInfo();
    if ('error' in info) return info.error;
    const session = (info as SessionInfoOk).session;
    const query = (ctx.query || '').trim().toLowerCase();

    const rejectWithDeps = (patchId: string) => {
      const p = session.generatedPatches.find(x => x.id === patchId);
      if (!p) return;
      session.rejectPatch(patchId);
      for (const dep of session.generatedPatches) {
        if (dep.dependsOn?.includes(patchId) && session.getPatchState(dep.id) === 'pending') {
          session.rejectPatch(dep.id, `Dependency rejected: patch ${session.generatedPatches.indexOf(p) + 1}`);
        }
      }
    };

    if (query === 'all') {
      let count = 0;
      for (const p of session.generatedPatches) {
        if (session.getPatchState(p.id) === 'pending') {
          rejectWithDeps(p.id);
          count++;
        }
      }
      return `Rejected ${count} patch(es).`;
    }

    const index = parseInt(query, 10);
    if (!isNaN(index) && index >= 1 && index <= session.generatedPatches.length) {
      const p = session.generatedPatches[index - 1];
      if (session.getPatchState(p.id) !== 'pending') {
        return `Patch ${index} is already ${session.getPatchState(p.id)}.`;
      }
      rejectWithDeps(p.id);
      return `Rejected patch ${index}${p.dependsOn?.length ? ' and its dependents.' : '.'}`;
    }

    const pending = session.generatedPatches.filter(p => session.getPatchState(p.id) === 'pending');
    if (pending.length === 0) return 'No pending patches to reject.';

    const p = pending[0];
    rejectWithDeps(p.id);
    return `Rejected patch ${session.generatedPatches.indexOf(p) + 1}.`;
  },
};

const nextPatchAction: PluginAction = {
  id: 'next patch',
  title: 'Next Patch',
  description: 'Navigate to the next patch',
  handler: async () => {
    return 'Navigate to next patch (keyboard: use >next patch / >prev patch)';
  },
};

const prevPatchAction: PluginAction = {
  id: 'prev patch',
  title: 'Previous Patch',
  description: 'Navigate to the previous patch',
  handler: async () => {
    return 'Navigate to previous patch';
  },
};

const applySessionAction: PluginAction = {
  id: 'apply',
  title: 'Apply Session',
  description: 'Apply all accepted patches as a single grouped transaction',
  handler: async (ctx) => {
    const info = getSessionInfo();
    if ('error' in info) return info.error;
    const session = (info as SessionInfoOk).session;
    const runtime = (info as SessionInfoOk).runtime;

    const acceptedPatches = session.generatedPatches.filter(
      p => session.getPatchState(p.id) === 'accepted' && p.patch
    );

    if (acceptedPatches.length === 0) {
      return 'No accepted patches to apply. Use >accept to approve patches first, or >accept all.';
    }

    const patches = acceptedPatches.map(p => p.patch);
    const inverse = invertPatches(patches);

    const currentDoc = runtime.editorContext.document;
    let newDocument: string;
    try {
      newDocument = applyPatches(currentDoc, patches);
    } catch (err) {
      return `Apply failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    /* persist FIRST — history commit only after successful write */
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: session.filePath, content: newDocument }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'write failed');
    } catch (writeErr) {
      const msg = `Write failed: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}. File not modified — no history entry created.`;
      eventBus.emit('feedback', { level: 'error', message: msg, dismissible: true });
      return msg;
    }

    /* write succeeded — now commit history + update editor state */
    runtime.groupedHistory.push(
      `AI: ${session.instructions.slice(0, 60)}`,
      patches,
      inverse,
      session.sessionId,
    );

    runtime.editorContext.document = newDocument;

    for (const p of acceptedPatches) {
      session.acceptPatch(p.id);
    }
    session.close();
    runtime.aiSessions.endSession();

    eventBus.emit(DomainEventTypes.EditApplied, {
      timestamp: Date.now(),
      filePath: session.filePath,
      content: newDocument,
      suggestionId: session.sessionId,
    });

    return `Applied ${acceptedPatches.length} accepted patch(es) to ${session.filePath}.`;
  },
};

const sessionUndoAction: PluginAction = {
  id: 'undo',
  title: 'Undo AI Session',
  description: 'Undo the entire AI session as one grouped transaction',
  handler: async (ctx) => {
    const runtime = getRuntime();

    if (!runtime.groupedHistory.canUndo()) {
      return 'Nothing to undo.';
    }

    const entry = runtime.groupedHistory.peekUndo()!;
    const currentDoc = runtime.editorContext.document;

    /* detect manual edits by checking if inverse patches still match */
    for (const p of entry.inverse) {
      const actual = currentDoc.slice(p.range.start, p.range.end);
      if (actual !== p.oldText) {
        return `Cannot undo: manual edits conflict with AI session at offset ${p.range.start}. Expected "${p.oldText.slice(0, 30)}", found "${actual.slice(0, 30)}". Revert manual edits first, or re-run /coder on the current file.`;
      }
    }

    const result = runtime.groupedHistory.undo(currentDoc);
    if (!result) return 'Undo failed: document state does not match expected content.';
    runtime.editorContext.document = result.document;
    return `Undid: ${result.entry.label}`;
  },
};

const sessionRedoAction: PluginAction = {
  id: 'redo',
  title: 'Redo AI Session',
  description: 'Redo the last undone AI session',
  handler: async (ctx) => {
    const runtime = getRuntime();
    const currentDoc = runtime.editorContext.document;
    const result = runtime.groupedHistory.redo(currentDoc);
    if (!result) return 'Nothing to redo.';
    runtime.editorContext.document = result.document;
    return `Redid: ${result.entry.label}`;
  },
};

export const aiPanelActions: PluginAction[] = [
  acceptAction,
  rejectAction,
  nextPatchAction,
  prevPatchAction,
  applySessionAction,
  sessionUndoAction,
  sessionRedoAction,
];
