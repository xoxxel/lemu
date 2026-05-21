import type { Plugin, PluginInputPayload, PluginInputResult } from '../../core/plugin-system/types';
import { getRuntime } from '../../core/runtime/instance';
import { editManifest } from './manifest';
import { editDefaultSettings, editSettingsSchema } from './settings';
import { editCommand } from './edit-command';
import { EditWorkflowView } from './EditWorkflowView';
import { editWorkflowActions } from './actions';
import { parseScopeWithDefault } from '../../core/operations/scope/parser';
import { resolveScopeNode } from '../../core/operations/scope/resolver';
import type { Operation, PipelineContext } from '../../core/operations/types';
import type { CMEditorSession } from '../../core/editor';

function countMatchesInRange(text: string, searchText: string, start: number, end: number): number {
  const lowerText = text.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  let count = 0;
  let pos = start;
  while (pos < end) {
    const idx = lowerText.indexOf(lowerSearch, pos);
    if (idx === -1 || idx >= end) break;
    count++;
    pos = idx + searchText.length;
  }
  return count;
}

function handleReplaceInput(
  payload: PluginInputPayload,
  runtime: ReturnType<typeof getRuntime>,
  appCtx: ReturnType<typeof runtime.getContext>,
  query: string,
): Promise<PluginInputResult> | PluginInputResult {
  if (!query) {
    return { message: 'Enter [scope]from=>to. Use >replace off to exit.' };
  }

  const document = (payload.state.currentContent as string) || '';
  if (!document) {
    return { message: 'No document content available.' };
  }

  const sepIndex = query.indexOf('=>');

  if (sepIndex === -1) {
    const { node: scopeNode, remaining: searchText } = parseScopeWithDefault(query);
    if (!searchText) {
      return { message: 'Enter text to search for.' };
    }

    const ctx: PipelineContext = { document, path: (payload.state.path as string) || '', state: {} };
    const resolved = resolveScopeNode(scopeNode, ctx);
    const searchRange = resolved.targets[0] ?? { start: 0, end: document.length };
    const matchCount = countMatchesInRange(document, searchText, searchRange.start, searchRange.end);

    const session = appCtx.get<CMEditorSession>('edit:session');
    if (session) {
      session.find(searchText, searchRange);
    }
    appCtx.set('edit:replace:refreshTick', Date.now());

    if (matchCount === 0) {
      appCtx.set('edit:replace:event', { type: 'search_empty', text: `No matches found for "${searchText}"` });
      return { message: `No matches found for "${searchText}"` };
    }

    let eventText: string;
    if (scopeNode.type === 'line') {
      eventText = `Found ${matchCount} match${matchCount > 1 ? 'es' : ''} on line ${scopeNode.line + 1}`;
    } else if (scopeNode.type === 'lineRange') {
      eventText = `Found ${matchCount} match${matchCount > 1 ? 'es' : ''} in lines ${scopeNode.startLine + 1}-${scopeNode.endLine}`;
    } else if (scopeNode.type === 'selection') {
      eventText = `Found ${matchCount} match${matchCount > 1 ? 'es' : ''} in selection`;
    } else {
      eventText = `Found ${matchCount} match${matchCount > 1 ? 'es' : ''} for "${searchText}"`;
    }

    appCtx.set('edit:replace:event', { type: 'search_success', text: eventText });
    return { message: eventText };
  }

  const beforeArrow = query.slice(0, sepIndex).trimEnd();
  const afterArrow = query.slice(sepIndex + 2).trimStart();

  if (!afterArrow) {
    return { message: 'Missing replacement text. Use: [scope]from=>to' };
  }

  const { node: scopeNode, remaining: fromText } = parseScopeWithDefault(beforeArrow);
  if (!fromText) {
    return { message: 'Missing search text.' };
  }

  const toText = afterArrow;
  const ctx: PipelineContext = {
    document,
    path: (payload.state.path as string) || '',
    state: {},
  };

  const operation: Operation = {
    type: 'replace',
    scope: scopeNode,
    args: { oldText: fromText, newText: toText },
  };

  return runtime.operations.run(operation, ctx).then((result) => {
    if (!result.success) {
      appCtx.set('edit:replace:event', { type: 'replace_error', text: result.error ?? 'Replace failed.' });
      return { message: result.error ?? 'Replace failed.' };
    }

    const newDocument = result.metadata?.newDocument as string | undefined;
    const patchCount = result.transaction?.patches.length ?? 0;

    const eventText = `Replaced ${patchCount} occurrence${patchCount > 1 ? 's' : ''}: "${fromText}" → "${toText}"`;
    appCtx.set('edit:replace:event', { type: 'replace_success', text: eventText });
    const session = appCtx.get<CMEditorSession>('edit:session');
    if (session) {
      session.clearSearch();
    }
    appCtx.set('edit:replace:refreshTick', Date.now());

    return {
      message: eventText,
      state: { currentContent: newDocument ?? document },
    };
  }).catch((err) => ({
    message: `Replace error: ${err instanceof Error ? err.message : String(err)}`,
  }));
}

export const editPlugin: Plugin = {
  id: 'edit',
  name: 'Edit Workflow',
  version: '0.1.0',
  description: 'Propose → diff → apply workflow for editing files',
  commands: [editCommand],
  actions: editWorkflowActions,
  views: [
    {
      type: 'edit-workflow',
      component: EditWorkflowView,
      meta: { label: 'Edit', icon: '\u270F' },
    },
  ],
  async onInput(payload: PluginInputPayload): Promise<PluginInputResult | void> {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const query = payload.input.trim();
    const replaceMode = appCtx.get<boolean>('edit:replace:mode') ?? false;

    if (replaceMode) {
      return handleReplaceInput(payload, runtime, appCtx, query);
    }

    const searchMode = appCtx.get<boolean>('edit:search:mode') ?? false;

    if (!searchMode) return;
    if (!query) {
      return { message: 'Enter a search query to find text in the document.' };
    }

    appCtx.set('edit:search:execute', query);
    return { message: `Searching for "${query}"` };
  },
  manifest: editManifest,
  settings: editDefaultSettings,
  settingsSchema: editSettingsSchema,
  interaction: {
    primaryInput: {
      enabled: true,
      grammar: '<start> [end]',
      examples: ['10', '10 20'],
    },
    placeholders: {
      defaultPlaceholder: 'Type > and chose action',
      primaryPlaceholder: 'chose action or type range, e.g. ">10" or ">10 20"',
    },
  },
};
