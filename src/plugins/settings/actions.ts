import type { PluginAction } from '../../core/actions/types';
import { settingsRegistry } from '../../core/settings/registry';
import { appContext } from '../../core/context';
import type { SettingsScope, SettingsUIState } from '../../core/settings/types';

const UI_KEY_PREFIX = 'settings:ui:';

function getUIKey(tabId: string): string {
  return `${UI_KEY_PREFIX}${tabId}`;
}

function getUI(tabId: string): SettingsUIState {
  return appContext.get<SettingsUIState>(getUIKey(tabId)) ?? {
    focusIndex: 0,
    editing: false,
    editValue: '',
    filter: '',
    scope: 'system',
  };
}

function setUI(tabId: string, patch: Partial<SettingsUIState>): void {
  const current = getUI(tabId);
  appContext.set(getUIKey(tabId), { ...current, ...patch });
}

export const settingsFilterAction: PluginAction = {
  id: 'filter',
  type: 'settings',
  title: 'Filter settings',
  description: 'Filter settings by key. Usage: >filter <text> or >filter ai',
  aliases: ['f'],
  handler: async (ctx) => {
    const parts = ctx.query.split(/\s+/);
    const filterText = parts.slice(1).join(' ').trim();
    if (!filterText) return 'Usage: >filter ai  (shows only ai.* settings)';
    if (ctx.tabId) setUI(ctx.tabId, { filter: filterText });
    return `Filtered to "${filterText}"`;
  },
};

export const settingsClearFilterAction: PluginAction = {
  id: 'clear-filter',
  type: 'settings',
  title: 'Clear filter',
  description: 'Remove the active filter and show all settings',
  aliases: ['cf', 'show-all'],
  handler: async (ctx) => {
    if (ctx.tabId) setUI(ctx.tabId, { filter: '' });
    return 'Filter cleared';
  },
};

export const settingsEditAction: PluginAction = {
  id: 'edit',
  type: 'settings',
  title: 'Edit focused setting',
  description: 'Start editing the currently focused setting value',
  aliases: ['e', 'modify'],
  handler: async (ctx) => {
    if (ctx.tabId) setUI(ctx.tabId, { editing: true });
    return 'Editing — press Enter to save, Esc to cancel';
  },
};

export const settingsSaveAction: PluginAction = {
  id: 'save',
  type: 'settings',
  title: 'Save current edit',
  description: 'Save the edited value and apply to runtime',
  aliases: ['s', 'apply'],
  handler: async (ctx) => {
    if (!ctx.tabId) return 'No active tab';
    const ui = getUI(ctx.tabId);
    const settings = settingsRegistry.getAll(ui.scope, ui.filter || undefined);
    const row = settings[ui.focusIndex];
    if (!row) return 'No focused setting';
    const def = settingsRegistry.getDefinition(row.key);
    let parsed: unknown = ui.editValue;
    if (def?.type === 'number') parsed = Number(ui.editValue);
    if (def?.type === 'boolean') parsed = ui.editValue === 'true' || ui.editValue === '1';
    settingsRegistry.set(row.key, parsed);
    setUI(ctx.tabId, { editing: false });
    return `Saved ${row.key} = ${String(parsed)}`;
  },
};

export const settingsResetAction: PluginAction = {
  id: 'reset',
  type: 'settings',
  title: 'Reset to default',
  description: 'Reset a setting to its default value',
  aliases: ['r', 'default'],
  handler: async (ctx) => {
    const parts = ctx.query.split(/\s+/);
    const lineArg = parts[1];
    if (!ctx.tabId) return 'No active tab';
    const ui = getUI(ctx.tabId);
    const settingsList = settingsRegistry.getAll(ui.scope, ui.filter || undefined);
    let row;
    if (lineArg) {
      const lineNum = parseInt(lineArg, 10);
      if (isNaN(lineNum) || lineNum < 1 || lineNum > settingsList.length) {
        return `Invalid line number: ${lineArg}. Use >reset <number>`;
      }
      row = settingsList[lineNum - 1];
    } else {
      row = settingsList[ui.focusIndex];
    }
    if (!row) return 'No setting to reset';
    const def = settingsRegistry.getDefinition(row.key);
    if (def?.defaultValue !== undefined) {
      settingsRegistry.set(row.key, def.defaultValue);
      return `Reset ${row.key} to default (${String(def.defaultValue)})`;
    }
    settingsRegistry.unset(row.key);
    return `Unset ${row.key}`;
  },
};

export const settingsUnsetAction: PluginAction = {
  id: 'unset',
  type: 'settings',
  title: 'Unset setting',
  description: 'Remove user-set value — reverts to default from definition',
  aliases: ['u', 'remove'],
  handler: async (ctx) => {
    const parts = ctx.query.split(/\s+/);
    const lineArg = parts[1];
    if (!ctx.tabId) return 'No active tab';
    const ui = getUI(ctx.tabId);
    const settingsList = settingsRegistry.getAll(ui.scope, ui.filter || undefined);
    let row;
    if (lineArg) {
      const lineNum = parseInt(lineArg, 10);
      if (isNaN(lineNum) || lineNum < 1 || lineNum > settingsList.length) {
        return `Invalid line: ${lineArg}. Use >unset <number>`;
      }
      row = settingsList[lineNum - 1];
    } else {
      row = settingsList[ui.focusIndex];
    }
    if (!row) return 'No setting to unset';
    settingsRegistry.unset(row.key);
    return `Unset ${row.key} — reverted to default`;
  },
};

export const settingsScopeAction: PluginAction = {
  id: 'scope',
  type: 'settings',
  title: 'Change scope',
  description: 'Switch settings scope: system | workspace | session',
  aliases: ['sc', 'scopeaction'],
  handler: async (ctx) => {
    const parts = ctx.query.split(/\s+/);
    const scope = parts[1] as SettingsScope;
    if (!scope || !['system', 'workspace', 'session'].includes(scope)) {
      return 'Usage: >scope system | workspace | session';
    }
    settingsRegistry.setScope(scope);
    if (ctx.tabId) setUI(ctx.tabId, { scope });
    return `Scope changed to ${scope}`;
  },
};

export const settingsReloadAction: PluginAction = {
  id: 'reload',
  type: 'settings',
  title: 'Reload settings',
  description: 'Re-read all settings from the registry',
  aliases: ['refresh', 'reread'],
  handler: async () => 'Settings reloaded — view updates automatically',
};

export const settingsActions: PluginAction[] = [
  settingsFilterAction,
  settingsClearFilterAction,
  settingsEditAction,
  settingsSaveAction,
  settingsResetAction,
  settingsUnsetAction,
  settingsScopeAction,
  settingsReloadAction,
];
