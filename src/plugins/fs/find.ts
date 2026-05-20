import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

export interface FindState {
  findMode: boolean;
  findQuery: string;
  findIndex: number;
  findCount: number;
}

export function defaultFindState(): FindState {
  return { findMode: false, findQuery: '', findIndex: 0, findCount: 0 };
}

export function findAllMatches(content: string, query: string): { start: number; end: number }[] {
  if (!query || !content) return [];
  const matches: { start: number; end: number }[] = [];
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
  } catch {
    /* invalid regex parts — treat as literal; already escaped so this won't fire */
  }
  return matches;
}

export function findMatchLines(content: string, query: string): Set<number> {
  const lines = new Set<number>();
  if (!query) return lines;
  const lower = query.toLowerCase();
  const split = content.split('\n');
  for (let i = 0; i < split.length; i++) {
    if (split[i].toLowerCase().includes(lower)) lines.add(i);
  }
  return lines;
}

export const findAction: PluginAction = {
  id: 'find',
  type: 'editor',
  title: 'Toggle find mode',
  description: 'Toggle incremental search within the editor. Owns plain-text input while active.',
  handler: async (ctx) => {
    const runtime = getRuntime();

    if (runtime.ownership.isOwnedBy('fs')) {
      runtime.ownership.release('fs');
      ctx.setState?.(defaultFindState() as unknown as Record<string, unknown>);
      return 'Find mode OFF';
    }

    runtime.ownership.acquire('fs', 'find', 'editor', ctx.tabId);
    ctx.setState?.({ findMode: true, findQuery: '', findIndex: 0, findCount: 0 } as Record<string, unknown>);
    return 'Find mode ON — type text to search, j/k to navigate, Enter for next, > for actions, / for commands';
  },
};
