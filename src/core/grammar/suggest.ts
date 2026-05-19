import { grammarRegistry } from './registry';
import { scopeResolver } from './scope';
import { parser } from './parser';
import type {
  GrammarSuggestion, GrammarContext,
  AstNode, CommandNode, ActionNode,
  Prefix,
} from './types';

export class SuggestionEngine {
  /**
   * Get suggestions for a partial input string, scoped to the active context.
   */
  suggest(input: string, context: GrammarContext): GrammarSuggestion[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    // Determine prefix from input
    const prefix = this.detectPrefix(trimmed);
    if (!prefix) {
      // No prefix → suggest commands, actions, and prefixes themselves
      return this.suggestPrefixes(trimmed);
    }

    const body = trimmed.slice(prefix.length).trimStart();
    const scopeCtx = scopeResolver.getActiveScopes(context.activeTabType);

    // Get all definitions for this prefix
    const allDefs = grammarRegistry.getAll();
    const scoped = scopeResolver.filterByScope(allDefs, scopeCtx, prefix);

    // Filter by body (partial match)
    const matched = body
      ? scoped.filter(d => this.match(d, body))
      : scoped;

    // Build suggestions
    const items: GrammarSuggestion[] = matched.map(d => ({
      value: prefix === '*>' ? '*>' + d.id : prefix + d.id,
      description: d.description || d.title,
      type: this.suggestionType(d.namespace, prefix),
      detail: d.usage,
    }));

    // If there's a body with args, try argument-aware completion
    if (body) {
      const parts = body.split(/\s+/);
      const cmdId = parts[0];
      const partialArg = parts.slice(1).join(' ') || '';
      const def = scoped.find(d => d.id === cmdId);

      if (def && def.args && partialArg !== undefined) {
        const argIdx = parts.length - 2; // which arg we're completing
        const argDef = def.args[argIdx];
        if (argDef?.suggest) {
          const argSuggestions = argDef.suggest(context, partialArg);
          items.push(...argSuggestions);
        }
      }
    }

    return items;
  }

  /**
   * Get argument-aware suggestions by parsing and examining AST state.
   */
  suggestForParse(input: string, context: GrammarContext): GrammarSuggestion[] {
    const result = parser.parse(input);
    if (!result.node) return this.suggest(input, context);

    // After parse, provide deeper suggestions based on AST state
    const trimmed = input.trim();
    const prefix = this.detectPrefix(trimmed);

    // If input ends with space, we're starting a new token
    if (trimmed.endsWith(' ') && result.node.type === 'command') {
      const cmd = result.node as CommandNode;
      const def = grammarRegistry.get(cmd.name);
      if (def?.args) {
        const argIndex = cmd.args.length;
        const argDef = def.args[argIndex];
        if (argDef?.suggest) {
          return argDef.suggest(context, '');
        }
      }
    }

    return this.suggest(input, context);
  }

  private detectPrefix(input: string): Prefix | null {
    if (input.startsWith('*>')) return '*>';
    if (input.startsWith('>')) return '>';
    if (input.startsWith('/')) return '/';
    if (input.startsWith(':')) return ':';
    if (input.startsWith('@')) return '@';
    return null;
  }

  private suggestPrefixes(partial: string): GrammarSuggestion[] {
    const prefixes: Array<{ prefix: string; description: string }> = [
      { prefix: '/', description: 'Run a command' },
      { prefix: '>', description: 'Tab action' },
      { prefix: '*>', description: 'Runtime action' },
      { prefix: '@', description: 'Help topic' },
      { prefix: ':', description: 'Terminal command' },
    ];

    const lower = partial.toLowerCase();
    return prefixes
      .filter(p => p.prefix.includes(lower) || lower.startsWith(p.prefix))
      .map(p => ({
        value: p.prefix,
        description: p.description,
        type: 'command' as const,
      }));
  }

  private match(def: { id: string; title?: string; description?: string }, query: string): boolean {
    const lower = query.toLowerCase();
    if (def.id.toLowerCase().includes(lower)) return true;
    if (def.title?.toLowerCase().includes(lower)) return true;
    if (def.description?.toLowerCase().includes(lower)) return true;
    return false;
  }

  private suggestionType(namespace: string, prefix: Prefix): 'command' | 'action' | 'help' | 'terminal' {
    if (prefix === '/') return 'command';
    if (prefix === '>' || prefix === '*>') return 'action';
    if (prefix === '@') return 'help';
    if (prefix === ':') return 'terminal';
    return 'command';
  }
}

export const suggestionEngine = new SuggestionEngine();
