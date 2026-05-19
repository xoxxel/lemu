import type { PluginManifest } from '../../core/plugin-system/types';

export const coderManifest: PluginManifest = {
  capabilities: ['ai-coder', 'edit-workflow'],
  permissions: { network: true },
  dependencies: ['edit'],
  services: {
    llm: {
      type: 'custom',
      required: true,
    },
  },
};
