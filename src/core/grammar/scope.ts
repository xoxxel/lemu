import type { ScopeDefinition, ScopeContext, Prefix, GrammarDefinition } from './types';

// Built-in scope hierarchy
const SCOPE_TREE: ScopeDefinition[] = [
  { id: 'global', label: 'Global Runtime', prefixes: ['*>'], parentId: null },
  { id: 'commands', label: 'Commands', prefixes: ['/'], parentId: 'global' },
  { id: 'runtime-actions', label: 'Runtime Actions', prefixes: ['*>'], parentId: 'global' },
  { id: 'help', label: 'Help', prefixes: ['@'], parentId: 'global' },
  { id: 'terminal', label: 'Terminal', prefixes: [':'], parentId: 'global' },
  { id: 'focus', label: 'Focus Context', prefixes: ['>'], parentId: 'global' },
];

export class ScopeResolver {
  private scopes = new Map<string, ScopeDefinition>(SCOPE_TREE.map(s => [s.id, s]));

  getScope(id: string): ScopeDefinition | undefined {
    return this.scopes.get(id);
  }

  getAllScopes(): ScopeDefinition[] {
    return Array.from(this.scopes.values());
  }

  resolvePrefix(prefix: Prefix): ScopeDefinition | undefined {
    return SCOPE_TREE.find(s => s.prefixes.includes(prefix));
  }

  getActiveScopes(tabType: string | null): ScopeContext {
    const available = tabType
      ? SCOPE_TREE
      : SCOPE_TREE.filter(s => s.id !== 'focus');

    return {
      activeScope: tabType ? 'focus' : 'global',
      availableScopes: available,
      tabType,
    };
  }

  /** Filter definitions based on current scope context */
  filterByScope(
    defs: GrammarDefinition[],
    context: ScopeContext,
    prefix?: Prefix,
  ): GrammarDefinition[] {
    if (!prefix) return defs;

    const scope = this.resolvePrefix(prefix);
    if (!scope) return [];

    // Runtime actions (*>) — only show runtime-namespace
    if (prefix === '*>') {
      return defs.filter(d => d.namespace === 'runtime');
    }

    // Commands (/) — show global namespace
    if (prefix === '/') {
      return defs.filter(d => d.namespace === 'global');
    }

    // Tab actions (>) — show plugin-namespace, filtered to active focus
    if (prefix === '>') {
      if (!context.tabType) return [];
      return defs.filter(d => d.namespace === 'plugin');
    }

    // Help (@) — show everything
    if (prefix === '@') {
      return defs;
    }

    return defs;
  }
}

export const scopeResolver = new ScopeResolver();
