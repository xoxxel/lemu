import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const searchDefaultSettings: PluginSettings = {
  treeDepth: 5,
  contentExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html'],
};

export const searchSettingsSchema: PluginSettingsSchema = {
  treeDepth: {
    type: 'number',
    label: 'Tree traversal depth',
    description: 'Maximum directory depth for file tree search',
  },
  contentExtensions: {
    type: 'multiline',
    label: 'Content search extensions',
    description: 'File extensions to include in content searches',
  },
};
