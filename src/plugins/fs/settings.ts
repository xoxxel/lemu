import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const fsDefaultSettings: PluginSettings = {
  deleteRequiresForce: true,
  workspaceValidation: true,
};

export const fsSettingsSchema: PluginSettingsSchema = {
  deleteRequiresForce: {
    type: 'boolean',
    label: 'Require -f flag for delete',
    description: 'When enabled, /delete requires -f to execute',
  },
  workspaceValidation: {
    type: 'boolean',
    label: 'Validate workspace path',
    description: 'Block operations that resolve outside the workspace',
  },
};
