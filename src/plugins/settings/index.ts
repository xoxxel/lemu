import type { Plugin, PluginInputResult, PluginInputPayload } from '../../core/plugin-system/types';
import { settingsManifest } from './manifest';
import { SettingsView } from './SettingsView';
import { settingsActions } from './actions';
import { settingsRegistry } from '../../core/settings/registry';

export const settingsPlugin: Plugin = {
  id: 'settings',
  name: 'Settings',
  version: '0.1.0',
  description: 'Runtime settings viewer and editor',
  manifest: settingsManifest,
  actions: settingsActions,
  views: [
    {
      type: 'settings',
      component: SettingsView,
      meta: { label: 'Settings', icon: '\u2699' },
    },
  ],

  async onInput(payload: PluginInputPayload): Promise<PluginInputResult | void> {
    const input = payload.input.trim();
    if (!input) return;

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'set' && parts.length >= 3) {
      const key = parts[1];
      const value = parts.slice(2).join(' ');
      settingsRegistry.set(key, value);
      return { message: `Set ${key} = ${value}` };
    }

    if (cmd === 'get' && parts[1]) {
      const value = settingsRegistry.get(parts[1]);
      return { message: `${parts[1]} = ${String(value ?? '(unset)')}` };
    }

    if (cmd === 'unset' && parts[1]) {
      settingsRegistry.unset(parts[1]);
      return { message: `Unset ${parts[1]}` };
    }

    if (cmd === 'scope' && parts[1]) {
      const scope = parts[1] as 'system' | 'workspace' | 'session';
      if (['system', 'workspace', 'session'].includes(scope)) {
        settingsRegistry.setScope(scope);
        return { message: `Scope changed to ${scope}` };
      }
    }

    if (cmd === 'filter' && parts[1]) {
      const filterText = parts.slice(1).join(' ');
      return { message: `Filtered to "${filterText}"`, state: { filter: filterText } };
    }

    return;
  },
};
