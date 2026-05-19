import type { PluginManifest } from '../../core/plugin-system/types';

export const calculatorManifest: PluginManifest = {
  capabilities: ['computation'],
  permissions: { clipboard: true },
};
