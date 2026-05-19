import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const gitDefaultSettings: PluginSettings = {
  subcommands: ['status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'log', 'diff', 'merge', 'clone', 'stash', 'tag', 'fetch', 'rebase'],
  prefix: 'git',
};

export const gitSettingsSchema: PluginSettingsSchema = {
  subcommands: {
    type: 'multiline',
    label: 'Git subcommands',
    description: 'Available git subcommands for autocomplete',
  },
  prefix: {
    type: 'string',
    label: 'Command prefix',
    description: 'The git binary name or path',
  },
};
