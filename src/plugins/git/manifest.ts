import type { PluginManifest } from '../../core/plugin-system/types';

export const gitManifest: PluginManifest = {
  capabilities: ['version-control'],
  permissions: { shell: true },
  apis: {
    shell: { path: '/api/shell/exec', method: 'POST' },
  },
  dependencies: [],
};
