import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const coderDefaultSettings: PluginSettings = {
  engine: 'default',
  provider: '',
  model: '',
  maxTokens: 4096,
  temperature: 0.3,
  includeContext: true,
};

export const coderSettingsSchema: PluginSettingsSchema = {
  engine: {
    type: 'string',
    label: 'Coding engine',
    description: 'Engine to use (default = AI provider, aider = Aider CLI)',
    placeholder: 'default',
  },
  provider: {
    type: 'string',
    label: 'AI provider',
    description: 'Provider ID to use (empty = global default)',
  },
  model: {
    type: 'string',
    label: 'Model',
    description: 'Model name (empty = provider default)',
    placeholder: 'qwen2.5-coder:7b',
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
