import { getRuntime } from '../../core/runtime/instance';
import { invertPatches, applyPatches as applyPatchesToDoc } from '../../core/operations/patch';
import type { PluginAction, ActionContext } from '../../core/actions/types';

export async function acceptPatch(ctx: ActionContext): Promise<string> {
  const runtime = getRuntime();
  const appCtx = runtime.getContext();
  const patches = appCtx.get<Array<{ range: { start: number; end: number }; oldText: string; newText: string; state?: string }>>('edit:ai:patches');

  if (!patches || patches.length === 0) return 'No AI patches to accept.';

  const query = (ctx.query || '').replace(/^accept\s*/i, '').trim();
  const index = parseInt(query, 10);
  if (isNaN(index) || index < 1 || index > patches.length) {
    return `Usage: >accept <n> where n is 1-${patches.length}`;
  }

  const patch = patches[index - 1];
  if (patch.state === 'accepted') return `Patch ${index} already accepted.`;
  if (patch.state === 'rejected') return `Patch ${index} was rejected. Use >reject to undo.`;

  patch.state = 'accepted';
  const updatedPatches = [...patches];
  const accepted = updatedPatches.filter(p => p.state === 'accepted');

  const baseDocument = appCtx.get<string>('edit:ai:baseDocument') ?? runtime.editorContext.document;
  let newDocument: string;
  try {
    newDocument = applyPatchesToDoc(baseDocument, accepted);
  } catch (err) {
    return `Apply failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  runtime.editorContext.document = newDocument;
  appCtx.set('edit:ai:patches', updatedPatches);
  ctx.setState?.({ currentContent: newDocument });
  return `Accepted patch ${index}. Changes applied to editor. Use >apply-patches to write to disk.`;
}

export async function rejectPatch(ctx: ActionContext): Promise<string> {
  const runtime = getRuntime();
  const appCtx = runtime.getContext();
  const patches = appCtx.get<Array<{ range: { start: number; end: number }; oldText: string; newText: string; state?: string }>>('edit:ai:patches');

  if (!patches || patches.length === 0) return 'No AI patches to reject.';

  const query = (ctx.query || '').replace(/^reject\s*/i, '').trim();
  const index = parseInt(query, 10);
  if (isNaN(index) || index < 1 || index > patches.length) {
    return `Usage: >reject <n> where n is 1-${patches.length}`;
  }

  const patch = patches[index - 1];
  patch.state = 'rejected';
  appCtx.set('edit:ai:patches', [...patches]);

  const accepted = patches.filter(p => p.state === 'accepted');
  const baseDocument = appCtx.get<string>('edit:ai:baseDocument') ?? runtime.editorContext.document;
  try {
    const refreshed = accepted.length > 0 ? applyPatchesToDoc(baseDocument, accepted) : baseDocument;
    runtime.editorContext.document = refreshed;
    ctx.setState?.({ currentContent: refreshed });
  } catch { }
  return `Rejected patch ${index}.`;
}

export async function applyPatches(ctx: ActionContext): Promise<string> {
  const runtime = getRuntime();
  const appCtx = runtime.getContext();
  const patches = appCtx.get<Array<{ range: { start: number; end: number }; oldText: string; newText: string; state?: string }>>('edit:ai:patches');

  if (!patches || patches.length === 0) return 'No AI patches.';

  const accepted = patches.filter(p => p.state === 'accepted');
  if (accepted.length === 0) return 'No accepted patches to apply. Use >accept <n> first.';

  const baseDocument = appCtx.get<string>('edit:ai:baseDocument') ?? runtime.editorContext.document;
  let newDocument: string;
  try {
    newDocument = applyPatchesToDoc(baseDocument, accepted);
  } catch (err) {
    return `Apply failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  const inverse = invertPatches(accepted);

  try {
    const res = await fetch('/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: runtime.editorContext.path, content: newDocument }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'write failed');
  } catch (writeErr) {
    return `Write failed: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}. No history entry created.`;
  }

  runtime.groupedHistory.push('AI mode edit', accepted, inverse);
  runtime.editorContext.document = newDocument;
  ctx.setState?.({ currentContent: newDocument });
  appCtx.set('edit:ai:patches', []);
  appCtx.set('edit:ai:messages', []);
  appCtx.remove('edit:ai:baseDocument');
  runtime.ownership.release('edit');
  appCtx.set('edit:ai:active', false);
  return `Applied ${accepted.length} patch(es) and exited AI mode.`;
}

const aiToggleAction: PluginAction = {
  id: 'ai',
  type: 'edit-workflow',
  title: 'AI edit mode',
  description: 'Toggle AI-assisted editing mode. Owns plain-text input while active.',
  ownsInput: true,
  handler: async (ctx) => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const query = ctx.query.replace(/^ai\s*/, '').trim();
    const subcommand = query.toLowerCase();

    if (subcommand === 'off') {
      runtime.ownership.release('edit');
      appCtx.set('edit:ai:active', false);
      appCtx.set('action:suffix:ai', '[off]');
      return 'AI mode OFF';
    }

    if (runtime.ownership.isOwnedBy('edit')) {
      return 'Tab already in AI mode. Use >ai off to exit.';
    }

    runtime.ownership.acquire('edit', 'ai', 'edit-workflow', ctx.tabId);
    appCtx.set('edit:ai:active', true);
    appCtx.set('action:suffix:ai', '[on]');

    return 'AI mode ON — describe the changes you want';
  },
};

const aiAcceptAction: PluginAction = {
  id: 'accept',
  type: 'edit-workflow',
  title: 'Accept AI Patch',
  description: 'Accept a generated AI patch by index. Usage: >accept <n>',
  handler: acceptPatch,
};

const aiRejectAction: PluginAction = {
  id: 'reject-patch',
  type: 'edit-workflow',
  title: 'Reject AI Patch',
  description: 'Reject a generated AI patch by index. Usage: >reject-patch <n>',
  handler: rejectPatch,
};

const aiApplyAction: PluginAction = {
  id: 'apply-patches',
  type: 'edit-workflow',
  title: 'Apply Accepted Patches',
  description: 'Apply all accepted AI patches to the file',
  handler: applyPatches,
};

export const aiModeActions: PluginAction[] = [
  aiToggleAction,
  aiAcceptAction,
  aiRejectAction,
  aiApplyAction,
];
