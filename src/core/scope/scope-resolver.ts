import type { CommandScope, Plugin } from '../plugin-system/types';
import type { PluginAction } from '../actions/types';
import { ActionRegistry } from '../actions';

export interface ScopeContext {
  /** The resolved scope from input + tab state */
  scope: CommandScope;
  /** The plugin focused by this scope (null for idle/global-action) */
  focusedPlugin: Plugin | null;
}

/**
 * Resolve the strict scope from raw input and the active plugin tab.
 *
 * Rules (enforced, no mixing):
 *  `/`   → command
 *  `@`   → help
 *  `:`   → terminal
 *  `>`   → action        (plugin actions ONLY, requires active plugin)
 *  `*>`  → global-action (global actions ONLY, never plugin)
 *  none  → primary       (plugin defined, requires active plugin)
 *  none  → idle          (no plugin tab)
 */
export function resolveScope(
  input: string,
  activePlugin: Plugin | null,
): ScopeContext {
  const trimmed = input.trim();

  if (trimmed.startsWith('/')) return { scope: 'command', focusedPlugin: null };
  if (trimmed.startsWith('@')) return { scope: 'help', focusedPlugin: null };
  if (trimmed.startsWith(':')) return { scope: 'terminal', focusedPlugin: null };
  if (trimmed.startsWith('*>')) return { scope: 'global-action', focusedPlugin: null };
  if (trimmed.startsWith('>')) {
    if (!activePlugin) return { scope: 'idle', focusedPlugin: null };
    return { scope: 'action', focusedPlugin: activePlugin };
  }
  return activePlugin
    ? { scope: 'primary', focusedPlugin: activePlugin }
    : { scope: 'idle', focusedPlugin: null };
}

/**
 * Get the placeholder text for the current scope.
 * Returns undefined to let the caller fall back to the default.
 */
export function getScopePlaceholder(
  scope: CommandScope,
  plugin: Plugin | null,
): string | undefined {
  if (scope === 'action' && plugin?.interaction?.placeholders?.primaryPlaceholder) {
    return plugin.interaction.placeholders.primaryPlaceholder;
  }
  if (scope === 'primary' && plugin?.interaction?.placeholders?.defaultPlaceholder) {
    return plugin.interaction.placeholders.defaultPlaceholder;
  }
  if (scope === 'global-action') return 'global action (e.g. settings, providers)';
  return undefined;
}

/**
 * Get actions for a scope — strictly scoped, no mixing.
 */
export function getScopeActions(
  scope: CommandScope,
  registry: ActionRegistry,
  plugin: Plugin | null,
  query: string,
): PluginAction[] {
  if (scope === 'global-action') {
    return registry.getGlobal().filter(a => matchesActionQuery(a, query));
  }
  if (scope === 'action' && plugin) {
    const type = plugin.views?.[0]?.type;
    if (!type) return [];
    return registry.getScoped(type).filter(a => matchesActionQuery(a, query));
  }
  return [];
}

function matchesActionQuery(action: PluginAction, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const idMatch = action.id.toLowerCase().includes(q);
  const titleMatch = action.title ? action.title.toLowerCase().includes(q) : false;
  const aliasMatch = action.aliases ? action.aliases.some(a => a.toLowerCase().includes(q)) : false;
  return idMatch || titleMatch || aliasMatch;
}
