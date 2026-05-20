import type { Plugin } from '../../core/plugin-system/types';
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
  manifest: editManifest,
  settings: editDefaultSettings,
  settingsSchema: editSettingsSchema,
  interaction: {
    primaryInput: {
      enabled: true,
      grammar: '<start> [end]',
      examples: ['10', '10 20'],
    },
  },
};
