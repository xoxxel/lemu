import type { AutocompleteItem } from '../commands/types';

export function fuzzyMatch(query: string, items: AutocompleteItem[]): AutocompleteItem[] {
  if (!query) return items;

  const lower = query.toLowerCase();

  return items.filter((item) => {
    const value = item.value.toLowerCase();
    if (value.includes(lower)) return true;
    let qi = 0;
    for (let i = 0; i < value.length && qi < lower.length; i++) {
      if (value[i] === lower[qi]) qi++;
    }
    return qi === lower.length;
  });
}

export function scoreMatch(query: string, item: AutocompleteItem): number {
  const lower = query.toLowerCase();
  const value = item.value.toLowerCase();

  if (value === lower) return 100;
  if (value.startsWith(lower)) return 80;
  if (value.includes(lower)) return 60;

  let qi = 0;
  for (let i = 0; i < value.length && qi < lower.length; i++) {
    if (value[i] === lower[qi]) qi++;
  }
  if (qi === lower.length) return 40;

  return 0;
}

export function sortByScore(query: string, items: AutocompleteItem[]): AutocompleteItem[] {
  return [...items].sort((a, b) => scoreMatch(query, b) - scoreMatch(query, a));
}
