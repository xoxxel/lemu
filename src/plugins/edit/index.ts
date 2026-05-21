import type { Plugin, PluginInputPayload, PluginInputResult } from '../../core/plugin-system/types';
import { getRuntime } from '../../core/runtime/instance';
import { editManifest } from './manifest';
import { editDefaultSettings, editSettingsSchema } from './settings';
import { editCommand } from './edit-command';
import { EditWorkflowView } from './EditWorkflowView';
import { editWorkflowActions } from './actions';
import { parseScopeWithDefault } from '../../core/operations/scope/parser';
import type { Operation, PipelineContext } from '../../core/operations/types';

function handleReplaceInput(
  payload: PluginInputPayload,
  runtime: ReturnType<typeof getRuntime>,
  appCtx: ReturnType<typeof runtime.getContext>,
  query: string,
): Promise<PluginInputResult> | PluginInputResult {
  if (!query) {
    return { message: 'Enter [scope]from=>to. Use >replace off to exit.' };
  }

  const sepIndex = query.indexOf('=>');

  if (sepIndex === -1) {
    const { remaining: searchText } = parseScopeWithDefault(query);
    if (!searchText) {
      return { message: 'Enter text to search for.' };
    }
    appCtx.set('edit:search:execute', searchText);
    return { message: `Searching for "${searchText}"` };
  }

  const beforeArrow = query.slice(0, sepIndex).trimEnd();
  const afterArrow = query.slice(sepIndex + 2).trimStart();

  const { node: scopeNode, remaining: fromText } = parseScopeWithDefault(beforeArrow);
  if (!fromText) {
    return { message: 'Nothing to replace — from text is empty.' };
  }

  const toText = afterArrow;
  const document = (payload.state.currentContent as string) || '';
  if (!document) {
    return { message: 'No document content available.' };
  }

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
      return { message: result.error ?? 'Replace failed.' };
    }

    const newDocument = result.metadata?.newDocument as string | undefined;
    const patchCount = result.transaction?.patches.length ?? 0;

    return {
      message: `Replaced ${patchCount} occurrence(s): ${fromText} => ${toText}`,
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
