import type { PluginManifest } from '../../core/plugin-system/types';

export const settingsManifest: PluginManifest = {
  capabilities: ['settings-ui', 'runtime-config'],
  events: {
    emits: ['settings:changed', 'settings:scope-changed'],
  },
};
