import { useState, useCallback } from 'react';
import { parse } from '../core/parser';
import { getRuntime } from '../core/runtime/instance';
import { fuzzyMatch, sortByScore } from '../core/autocomplete';
import { registry } from '../core/commands/registry';
import type { AutocompleteItem } from '../core/commands/types';
import type { GrammarContext, GrammarSuggestion } from '../core/grammar/types';
import { suggestionEngine } from '../core/grammar/suggest';
import { scopeResolver } from '../core/grammar/scope';
import type { CommandScope } from '../core/plugin-system/types';
import { resolveScope, getScopeActions } from '../core/scope/scope-resolver';

export function useAutocomplete(scope: CommandScope, activePlugin: { id: string; views?: Array<{ type: string }> } | null) {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  const update = useCallback(async (input: string) => {
    const runtime = getRuntime();

    /* ── Ownership context: show owner info in status ── */
    if (runtime.ownership.hasOwner()) {
      const owner = runtime.ownership.getOwner()!;
      if (owner.pluginId === 'fs' && owner.actionId === 'find') {
        setStatusText('find [on] — type text to search, j/k next/prev, Enter next, Shift+Enter prev');
      } else {
        setStatusText(`owned by "${owner.pluginId}" (type /, :, @, >, *> for root triggers)`);
      }
    } else {
      setStatusText(null);
    }

    /* ── Action scope: ONLY plugin actions, by prefix, no mixing ── */
    if (input.startsWith('*>')) {
      const query = input.replace(/^\*>/, '').trim();
      const acts = runtime.actionRegistry.getGlobal().filter(a => {
        if (!query) return true;
        const q = query.toLowerCase();
        return a.id.toLowerCase().includes(q) || a.title?.toLowerCase().includes(q);
      });
      const ctx = runtime.getContext();
      const seen = new Set<string>();
      setSuggestions(acts.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }).map(a => ({
        value: '*>' + a.id,
        description: a.title || a.description || '',
        type: 'action' as const,
        suffix: ctx.get<string>('action:suffix:' + a.id) ?? undefined,
      })));
      setSelectedIndex(0);
      setStatusText(null);
      return;
    }

    if (input.startsWith('>')) {
      const query = input.replace(/^>/, '').trim();
      /* No active plugin → instruct, never show actions */
      if (!activePlugin) {
        setSuggestions([{
          value: '',
          description: 'Open a plugin tab first (e.g. /edit file.ts)',
          type: 'help',
        }]);
        setSelectedIndex(0);
        setStatusText(null);
        return;
      }
      const tabType = activePlugin.views?.[0]?.type;
      if (!tabType) { setSuggestions([]); setStatusText(null); return; }
      const acts = runtime.actionRegistry.getScoped(tabType).filter(a => {
        if (!query) return true;
        const q = query.toLowerCase();
        return a.id.toLowerCase().includes(q) || a.title?.toLowerCase().includes(q);
      });
      const ctx = runtime.getContext();
      const seen = new Set<string>();
      setSuggestions(acts.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }).map(a => ({
        value: '>' + a.id,
        description: a.title || a.description || '',
        type: 'action' as const,
        suffix: ctx.get<string>('action:suffix:' + a.id) ?? undefined,
      })));
      setSelectedIndex(0);
      setStatusText(null);
      return;
    }

    // Use grammar suggestion engine as primary path
    const ctx: GrammarContext = {
      activeTabType: activePlugin?.views?.[0]?.type ?? null,
      activeTabId: null,
      pinned: false,
      query: input,
    };

    const grammarItems = suggestionEngine.suggest(input, ctx);

    if (grammarItems.length > 0) {
      const items: AutocompleteItem[] = grammarItems.map(g => ({
        value: g.value,
        description: g.description,
        type: (g.type === 'action' || g.type === 'command') ? g.type : 'command',
      }));
      setSuggestions(items);
      setStatusText(null);
      setSelectedIndex(0);
      return;
    }

    // Fallback: old autocomplete paths for non-prefixed input
    if (!input.startsWith('/') && !input.startsWith('@') && !input.startsWith(':')) {
      setSuggestions([]);
      setStatusText(null);
      return;
    }

    // Old path for command autocomplete (file paths, etc.)
    if (input.startsWith('/')) {
      const parsed = parse(input);
      if (!parsed) {
        setSuggestions([]);
        return;
      }

      const allCommands = registry.getAll().map((c) => ({
        value: `/${c.name}`,
        description: c.description,
        type: 'command' as const,
      }));

      if (parsed.name && parsed.args.length === 0) {
        const cmdItems = fuzzyMatch(parsed.name, allCommands);
        const sorted = sortByScore(parsed.name, cmdItems);
        setSuggestions(sorted);
        setSelectedIndex(0);
        return;
      }

      const items = await runtime.getAutocomplete(parsed);
      setSuggestions(items);
      setSelectedIndex(0);
      return;
    }

    setSuggestions([]);
    setStatusText(null);
  }, [activePlugin]);

  const clear = useCallback(() => {
    setSuggestions([]);
    setStatusText(null);
    setSelectedIndex(0);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
  }, [suggestions.length]);

  const selectPrev = useCallback(() => {
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const selectCurrent = useCallback((): string | null => {
    if (suggestions.length === 0) return null;
    return suggestions[selectedIndex]?.value ?? null;
  }, [suggestions, selectedIndex]);

  return {
    suggestions,
    selectedIndex,
    statusText,
    update,
    clear,
    selectNext,
    selectPrev,
    selectCurrent,
    isOpen: suggestions.length > 0,
  };
}
