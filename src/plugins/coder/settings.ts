import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const coderDefaultSettings: PluginSettings = {
  provider: '',
  model: '',
  maxTokens: 4096,
  temperature: 0.3,
  includeContext: true,
};

export const coderSettingsSchema: PluginSettingsSchema = {
  provider: {
    type: 'string',
    label: 'AI provider',
    description: 'Provider ID to use (empty = global default)',
  },
  model: {
    type: 'string',
    label: 'Model',
    description: 'Model name (empty = provider default)',
    placeholder: 'gpt-4o',
  },
  maxTokens: {
    type: 'number',
    label: 'Max tokens',
    description: 'Maximum response tokens',
  },
  temperature: {
    type: 'number',
    label: 'Temperature',
    description: 'Response creativity (0.0 – 1.0)',
  },
  includeContext: {
    type: 'boolean',
    label: 'Include workspace context',
    description: 'Send workspace tree and file list with each request',
  },
};
