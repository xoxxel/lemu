import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

function getPendingKey(tabId: string): string {
  return `edit:pending:${tabId}`;
}

export const pendingFocus = { value: null as { start: number; end: number } | null, seq: 0 };

function parseRange(input: string): { start: number; end: number } | null {
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

export const focusAction: PluginAction = {
  id: 'focus',
  type: 'edit-workflow',
  title: 'Focus line/range',
  description: 'Focus a line or range (e.g. >10 or >10 15)',
  handler: async (ctx) => {
    const range = parseRange(ctx.query);
    if (!range) return `Could not parse range: "${ctx.query}". Usage: >10 or >10 15`;
    const tabState = ctx.tabState as Record<string, unknown>;
    tabState.focusedRange = { start: range.start, end: range.end };
    pendingFocus.value = range;
    pendingFocus.seq++;
    return `Focused lines ${range.start}-${range.end}`;
  },
};

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

export const diffToggleAction: PluginAction = {
  id: 'diff',
  type: 'edit-workflow',
  title: 'Toggle diff panel',
  description: 'Toggle diff visibility',
  handler: async (_ctx) => {
    const appCtx = getRuntime().getContext();
    const current = appCtx.get<boolean>('edit:diffVisible') ?? true;
    appCtx.set('edit:diffVisible', !current);
    appCtx.set('action:suffix:diff', !current ? '[on]' : '[off]');
    return `Diff panel ${!current ? 'enabled' : 'disabled'}`;
  },
};

export const findAction: PluginAction = {
  id: 'find',
  type: 'edit-workflow',
  title: 'Find in document',
  description: 'Search for text in the current document',
  handler: async (ctx) => {
    const appCtx = getRuntime().getContext();
    const query = ctx.query.replace('find', '').trim();
    if (query) {
      appCtx.set('edit:search:execute', query);
      return `Searching for "${query}"`;
    }
    appCtx.set('edit:search:mode', true);
    appCtx.set('edit:search:modeMsg', 'Enter search query in the editor bar');
    return 'Enter search query...';
  },
};

export const nextAction: PluginAction = {
  id: 'next',
  type: 'edit-workflow',
  title: 'Next match',
  description: 'Move to the next search match',
  handler: async () => {
    const appCtx = getRuntime().getContext();
    appCtx.set('edit:search:navigate', 'next');
    return 'Next match';
  },
};

export const prevAction: PluginAction = {
  id: 'prev',
  type: 'edit-workflow',
  title: 'Previous match',
  description: 'Move to the previous search match',
  handler: async () => {
    const appCtx = getRuntime().getContext();
    appCtx.set('edit:search:navigate', 'prev');
    return 'Previous match';
  },
};

export const editWorkflowActions: PluginAction[] = [
  focusAction,
  proposeAction,
  applyAction,
  rejectAction,
  revertAction,
  diffToggleAction,
  findAction,
  nextAction,
  prevAction,
];
