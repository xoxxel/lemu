import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

export function resolveActionsForTabType(tabType: string | null): PluginAction[] | null {
  if (!tabType) return null;
  const runtime = getRuntime();
  const plugin = runtime.pluginRegistry.getPluginByTabType(tabType);
  if (!plugin) return null;
  if (plugin.getActions) {
    return plugin.getActions();
  }
  return plugin.actions ?? [];
}

export function matchAction(query: string, action: PluginAction): boolean {
  const lower = query.toLowerCase();
  if (action.id.toLowerCase().includes(lower)) return true;
  if (action.title?.toLowerCase().includes(lower)) return true;
  if (action.aliases?.some(a => a.toLowerCase().includes(lower))) return true;
  return false;
}

export const actionsPlugin: Plugin = {
  id: 'actions',
  name: 'Plugin Actions',
  version: '0.1.0',
  description: 'Action mode (> prefix) for plugin-scoped actions',
  async activate(_ctx: PluginContext) {
    console.log('[ACTIONS] Plugin actions system ready');
  },
};
