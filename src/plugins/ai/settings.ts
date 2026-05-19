import type { PluginSettings, PluginSettingsSchema } from '../../core/plugin-system/types';

export const aiDefaultSettings: PluginSettings = {
  maxAgentIterations: 25,
  maxTokens: 4096,
  model: 'gpt-4o',
  endpoint: 'https://api.openai.com/v1',
};

export const aiSettingsSchema: PluginSettingsSchema = {
  maxAgentIterations: {
    type: 'number',
    label: 'Max agent iterations',
    description: 'Maximum tool-calling iterations per agent run',
  },
  maxTokens: {
    type: 'number',
    label: 'Max tokens',
    description: 'Maximum response tokens from the LLM',
  },
  model: {
    type: 'string',
    label: 'Model name',
    description: 'OpenAI-compatible model identifier',
    placeholder: 'gpt-4o',
  },
  endpoint: {
    type: 'string',
    label: 'API endpoint',
    description: 'OpenAI-compatible API base URL',
    placeholder: 'https://api.openai.com/v1',
  },
};
