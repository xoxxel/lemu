import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const execDefaultSettings: PluginSettings = {
  autocompleteSuggestions: ['npm ', 'git ', 'node ', 'ls', 'cat '],
};

export const execSettingsSchema: PluginSettingsSchema = {
  autocompleteSuggestions: {
    type: 'multiline',
    label: 'Autocomplete suggestions',
    description: 'List of shell command suggestions for autocomplete',
  },
};
