import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const editDefaultSettings: PluginSettings = {
  autoPreviewDiff: true,
  confirmBeforeApply: true,
  maxUndoHistory: 50,
};

export const editSettingsSchema: PluginSettingsSchema = {
  autoPreviewDiff: {
    type: 'boolean',
    label: 'Auto-preview diff',
    description: 'Show diff automatically when content changes',
  },
  confirmBeforeApply: {
    type: 'boolean',
    label: 'Confirm before apply',
    description: 'Require confirmation before writing changes to disk',
  },
  maxUndoHistory: {
    type: 'number',
    label: 'Max undo history',
    description: 'Maximum number of undo entries to keep per session',
  },
};
