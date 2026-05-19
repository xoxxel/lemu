import type { PluginManifest } from '../../core/plugin-system/types';

export const fsManifest: PluginManifest = {
  capabilities: ['file-editing', 'file-browsing'],
  permissions: { filesystem: true },
  apis: {
    read: { path: '/api/fs/read', method: 'GET' },
    list: { path: '/api/fs/list', method: 'GET' },
    copy: { path: '/api/fs/copy', method: 'POST' },
    move: { path: '/api/fs/move', method: 'POST' },
    delete: { path: '/api/fs/delete', method: 'POST' },
  },
  events: {
    emits: ['fs:opened', 'fs:copied', 'fs:moved', 'fs:deleted', 'fs:error'],
    subscribes: ['command:executed'],
  },
};
