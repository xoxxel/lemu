import type { PluginManifest } from '../../core/plugin-system/types';

export const aiManifest: PluginManifest = {
  capabilities: ['ai-chat', 'ai-agent'],
  permissions: { network: true },
  services: {
    llm: {
      type: 'openai',
      required: true,
      defaultEndpoint: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
    },
  },
};
