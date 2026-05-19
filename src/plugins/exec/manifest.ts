import type { PluginManifest } from '../../core/plugin-system/types';

export const execManifest: PluginManifest = {
  capabilities: ['shell-execution'],
  permissions: { shell: true },
  apis: {
    shell: { path: '/api/shell/exec', method: 'POST' },
  },
};
