import type { Plugin, PluginInputPayload, PluginInputResult } from '../../core/plugin-system/types';
import { getRuntime } from '../../core/runtime/instance';
import { editManifest } from './manifest';
import { editDefaultSettings, editSettingsSchema } from './settings';
import { editCommand } from './edit-command';
import { EditWorkflowView } from './EditWorkflowView';
import { editWorkflowActions } from './actions';

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
