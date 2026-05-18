import { useState, useCallback } from 'react';
import { parse } from '../core/parser';
import { getRuntime } from '../core/runtime/instance';
import { fuzzyMatch, sortByScore } from '../core/autocomplete';
import { registry } from '../core/commands/registry';
import type { AutocompleteItem } from '../core/commands/types';

export function useAutocomplete(activeTabType: string | null) {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  const update = useCallback(async (input: string) => {
    if (input.startsWith('>')) {
      const query = input.slice(1).trim();
      const runtime = getRuntime();
      const resolveActionsForTabType = runtime.resolveActionsForTabType;
      const matchAction = runtime.matchAction;
      const actions = resolveActionsForTabType(activeTabType);
      if (actions === null) {
        setSuggestions([]);
        setStatusText('No active plugin tab');
        return;
      }
      if (actions.length === 0) {
        setSuggestions([]);
        setStatusText('No actions available');
        return;
      }

      const matched = query
        ? actions.filter(a => matchAction(query, a))
        : actions;

      const items: AutocompleteItem[] = matched.map(a => ({
        value: '>' + a.id,
        description: a.title ?? a.description ?? a.id,
        type: 'action' as const,
      }));

      setSuggestions(items);
      setStatusText(null);
      setSelectedIndex(0);
      return;
    }

    if (input.startsWith('@')) {
      const query = input.slice(1).trim();
      const allCommands = registry.getAll().map((c) => ({
        value: `@${c.name}`,
        description: c.description,
        type: 'command' as const,
      }));

      const matched = query
        ? fuzzyMatch(query, allCommands)
        : allCommands;
      const sorted = query ? sortByScore(query, matched) : matched;

      setSuggestions(sorted);
      setStatusText(null);
      setSelectedIndex(0);
      return;
    }

    if (!input.startsWith('/')) {
      setSuggestions([]);
      setStatusText(null);
      return;
    }

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

    const items = await getRuntime().getAutocomplete(parsed);
    setSuggestions(items);
    setSelectedIndex(0);
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
