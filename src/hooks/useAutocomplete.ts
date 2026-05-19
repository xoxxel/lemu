import { useState, useCallback } from 'react';
import { parse } from '../core/parser';
import { getRuntime } from '../core/runtime/instance';
import { fuzzyMatch, sortByScore } from '../core/autocomplete';
import { registry } from '../core/commands/registry';
import type { AutocompleteItem } from '../core/commands/types';
import type { GrammarContext, GrammarSuggestion } from '../core/grammar/types';
import { suggestionEngine } from '../core/grammar/suggest';
import { scopeResolver } from '../core/grammar/scope';

export function useAutocomplete(activeTabType: string | null) {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  const update = useCallback(async (input: string) => {
    const runtime = getRuntime();

    // Use grammar suggestion engine as primary path
    const ctx: GrammarContext = {
      activeTabType,
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
    if (!input.startsWith('/') && !input.startsWith('>') && !input.startsWith('*>') && !input.startsWith('@') && !input.startsWith(':')) {
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
  }, [activeTabType]);

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
