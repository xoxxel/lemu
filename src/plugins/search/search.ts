import type { Command } from '../../core/commands/types';

export interface SearchResult {
  file: string;
  line: number;
  content: string;
}

let _lastResults: SearchResult[] = [];

export function getLastResults(): SearchResult[] {
  return _lastResults;
}

const api = {
  async search(pattern: string, dir?: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ pattern });
    if (dir) params.set('dir', dir);
    const res = await fetch(`/api/fs/search?${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.results;
  },

  async tree(dir?: string): Promise<string[]> {
    const params = new URLSearchParams();
    if (dir) params.set('dir', dir);
    params.set('depth', '5');
    const res = await fetch(`/api/fs/tree?${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.tree.split('\n').map((l: string) => l.trim()).filter(Boolean);
  },
};

function isWildcardPattern(pattern: string): boolean {
  return pattern.includes('*');
}

async function searchFilesByExtension(pattern: string): Promise<SearchResult[]> {
  const ext = pattern.replace('*.', '.').toLowerCase();
  const lines = await api.tree();
  const results: SearchResult[] = [];
  for (const line of lines) {
    const clean = line.replace(/\/$/, '');
    if (clean.toLowerCase().endsWith(ext)) {
      results.push({ file: clean, line: 0, content: '' });
    }
  }
  return results;
}

async function searchFilesByName(pattern: string): Promise<SearchResult[]> {
  const lower = pattern.toLowerCase();
  const lines = await api.tree();
  const results: SearchResult[] = [];
  for (const line of lines) {
    const clean = line.replace(/\/$/, '');
    const filename = clean.split('/').pop() || clean;
    if (filename.toLowerCase().includes(lower)) {
      results.push({ file: clean, line: 0, content: '' });
    }
  }
  return results;
}

export async function performSearch(pattern: string, dir?: string): Promise<SearchResult[]> {
  if (isWildcardPattern(pattern)) {
    return searchFilesByExtension(pattern);
  }
  const [fileResults, contentResults] = await Promise.all([
    searchFilesByName(pattern),
    api.search(pattern, dir),
  ]);
  const seen = new Set<string>();
  const merged: SearchResult[] = [];
  for (const r of fileResults) {
    if (!seen.has(r.file)) {
      seen.add(r.file);
      merged.push(r);
    }
  }
  for (const r of contentResults) {
    if (seen.has(r.file)) {
      const idx = merged.findIndex(m => m.file === r.file);
      if (idx !== -1) merged[idx] = r;
    } else {
      seen.add(r.file);
      merged.push(r);
    }
  }
  return merged;
}

const searchCommand: Command = {
  name: 'search',
  description: 'Search file contents or filenames',
  aliases: ['grep', 'find'],
  usage: '/search <pattern> [directory]',
  examples: [
    { input: '/search useEffect', description: 'Search file contents for text' },
    { input: '/search auth', description: 'Search for function or variable usage' },
    { input: '/search *.md', description: 'Find all markdown files' },
    { input: '/search *.ts src', description: 'Find TypeScript files in src directory' },
  ],
  edgeCases: [
    { scenario: 'no pattern', input: '/search', expected: 'Usage error' },
    { scenario: 'no results', input: '/search xyzzy_nonexistent', expected: 'No results for...' },
  ],
  async execute(args) {
    const pattern = args[0];
    const dir = args[1];
    try {
      const results = await performSearch(pattern, dir);
      _lastResults = results;
      if (results.length === 0) {
        return { success: true, message: `No results for "${pattern}"` };
      }
      return {
        success: true,
        message: `Found ${results.length} result(s) for "${pattern}"`,
        data: { type: 'search', results, query: pattern },
      };
    } catch (err) {
      return { success: false, message: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    if (args.length <= 1) return [];
    return [{ value: '.', description: 'current directory', type: 'dir' }];
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /search <pattern> [directory]';
    return null;
  },
};

export default searchCommand;
