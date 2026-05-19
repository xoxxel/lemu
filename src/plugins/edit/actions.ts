import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

function getPendingKey(tabId: string): string {
  return `edit:pending:${tabId}`;
}

export const proposeAction: PluginAction = {
  id: 'propose',
  type: 'edit-workflow',
  title: 'Propose changes',
  description: 'Generate diff from current content vs original',
  handler: async (ctx) => {
    const { tabState, tabId } = ctx;
    const original = tabState.originalContent as string;
    const current = tabState.currentContent as string;

    if (!original || !current) return 'No file content loaded.';
    if (current === original) return 'No changes to propose. Edit the content first.';

    const runtime = getRuntime();
    const pipeline = runtime.getEditPipeline();
    const suggestion = await pipeline.propose({
      filePath: tabState.path as string,
      originalContent: original,
      proposedContent: current,
      source: 'user',
    });

    const appCtx = runtime.getContext();
    appCtx.set(getPendingKey(tabId!), suggestion.id);

    let msg = `Proposed changes for ${suggestion.filePath}\n${suggestion.diff}`;
    msg += `\n\nUse >apply to write, >reject to discard.`;
    return msg;
  },
};

export const applyAction: PluginAction = {
  id: 'apply',
  type: 'edit-workflow',
  title: 'Apply changes',
  description: 'Write proposed changes to disk',
  handler: async (ctx) => {
    const { tabId } = ctx;
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const suggestionId = appCtx.get<string>(getPendingKey(tabId!));
    if (!suggestionId) return 'No pending proposal. Use >propose first.';

    const pipeline = runtime.getEditPipeline();
    const result = await pipeline.approve(suggestionId);
    if (!result) return 'Suggestion not found or already processed.';

    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: result.filePath, content: result.proposedContent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err) {
      return `File write failed: ${err instanceof Error ? err.message : String(err)}`;
    }

    appCtx.remove(getPendingKey(tabId!));
    return `Applied changes to ${result.filePath}`;
  },
};

export const rejectAction: PluginAction = {
  id: 'reject',
  type: 'edit-workflow',
  title: 'Reject changes',
  description: 'Discard the proposed changes',
  handler: async (ctx) => {
    const { tabId } = ctx;
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const suggestionId = appCtx.get<string>(getPendingKey(tabId!));
    if (!suggestionId) return 'No pending proposal to reject.';

    runtime.getEditPipeline().reject(suggestionId, 'Rejected by user');
    appCtx.remove(getPendingKey(tabId!));
    return 'Proposal rejected. Use >propose again after editing.';
  },
};

export const revertAction: PluginAction = {
  id: 'revert',
  type: 'edit-workflow',
  title: 'Revert to original',
  description: 'Restore original content',
  handler: async (ctx) => {
    const { tabId } = ctx;
    getRuntime().getContext().remove(getPendingKey(tabId!));
    return `Reverted. Reload the file with /edit to start fresh.`;
  },
};

export const showDiffAction: PluginAction = {
  id: 'show-diff',
  type: 'edit-workflow',
  title: 'Show diff',
  description: 'Display diff against original',
  handler: async (ctx) => {
    const { tabState } = ctx;
    const original = tabState.originalContent as string;
    const current = tabState.currentContent as string;
    if (!original || current === original) return 'No changes to show.';

    const runtime = getRuntime();
    const pipeline = runtime.getEditPipeline();
    const suggestion = await pipeline.propose({
      filePath: tabState.path as string,
      originalContent: original,
      proposedContent: current,
      source: 'user',
    });
    return suggestion.diff || '(empty diff)';
  },
};

export const editWorkflowActions: PluginAction[] = [
  proposeAction,
  applyAction,
  rejectAction,
  revertAction,
  showDiffAction,
];
