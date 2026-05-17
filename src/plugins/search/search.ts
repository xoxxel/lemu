import type { Command, AutocompleteItem } from '../../core/commands/types';

const api = {
  async search(pattern: string, dir?: string): Promise<{ file: string; line: number; content: string }[]> {
    const params = new URLSearchParams({ pattern });
    if (dir) params.set('dir', dir);
    const res = await fetch(`/api/fs/search?${params}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.results;
  },
};

const searchCommand: Command = {
  name: 'search',
  description: 'Search file contents for a pattern',
  aliases: ['grep', 'find'],
  usage: '/search <pattern> [directory]',
  examples: [
    { input: '/search useState', description: 'Search for component usage' },
    { input: '/search TODO src/components', description: 'Search in specific directory' },
    { input: '/grep function', description: 'Search using alias' },
  ],
  edgeCases: [
    { scenario: 'no pattern', input: '/search', expected: 'Usage error' },
    { scenario: 'no results', input: '/search xyzzy_nonexistent', expected: 'No results for...' },
    { scenario: 'directory traversal', input: '/search foo ../../etc', expected: 'error: Path outside workspace' },
  ],
  async execute(args) {
    const pattern = args[0];
    const dir = args[1];
    try {
      const results = await api.search(pattern, dir);
      if (results.length === 0) {
        return { success: true, message: `No results for "${pattern}"` };
      }
      return {
        success: true,
        message: `Found ${results.length} result(s) for "${pattern}"`,
        data: { results, type: 'search' },
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
