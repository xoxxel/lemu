import type { PluginManifest } from '../../core/plugin-system/types';

export const editManifest: PluginManifest = {
  capabilities: ['edit', 'diff'],
  permissions: { filesystem: true },
  apis: {
    read: { path: '/api/fs/read', method: 'GET' },
    write: { path: '/api/fs/write', method: 'POST' },
  },
  events: {
    emits: ['edit:proposed', 'edit:applied', 'edit:rejected', 'edit:reverted'],
  },
  dependencies: ['fs'],
};
