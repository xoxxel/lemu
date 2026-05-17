import { useState, useCallback } from 'react';
import { parse } from '../core/parser';
import { executor } from '../core/executor';
import { fuzzyMatch, sortByScore } from '../core/autocomplete';
import { registry } from '../core/commands/registry';
import type { AutocompleteItem } from '../core/commands/types';

export function useAutocomplete() {
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const update = useCallback(async (input: string) => {
    if (!input.startsWith('/')) {
      setSuggestions([]);
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

    const items = await executor.getAutocomplete(parsed);
    setSuggestions(items);
    setSelectedIndex(0);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
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
    update,
    clear,
    selectNext,
    selectPrev,
    selectCurrent,
    isOpen: suggestions.length > 0,
  };
}
