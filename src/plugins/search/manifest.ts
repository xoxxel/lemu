import type { PluginManifest } from '../../core/plugin-system/types';

export const searchManifest: PluginManifest = {
  capabilities: ['search'],
  permissions: { filesystem: true },
  apis: {
    search: { path: '/api/fs/search', method: 'GET' },
    tree: { path: '/api/fs/tree', method: 'GET' },
  },
  dependencies: ['fs'],
};
