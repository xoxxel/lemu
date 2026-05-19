import type { Command, AutocompleteItem } from '../../core/commands/types';

const API = {
  async readFile(path: string): Promise<string> {
    const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.content;
  },

  async listFiles(dir?: string): Promise<AutocompleteItem[]> {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`/api/fs/list${params}`);
    const data = await res.json();
    if (!data.success) return [];
    return data.entries.map((e: { name: string; isDir: boolean }) => ({
      value: e.name,
      type: e.isDir ? 'dir' as const : 'file' as const,
    }));
  },
};

const editCommand: Command = {
  name: 'edit',
  description: 'Open a file in the edit workflow (propose → diff → apply)',
  aliases: ['e', 'modify'],
  usage: '/edit <filepath>',
  examples: [
    { input: '/edit README.md', description: 'Open file for editing with workflow support' },
    { input: '/e src/App.tsx', description: 'Open using alias' },
  ],
  edgeCases: [
    { scenario: 'file not found', input: '/edit nope.ts', expected: 'error with ENOENT description' },
    { scenario: 'path traversal', input: '/edit ../../etc/passwd', expected: 'error: Path outside workspace' },
  ],

  async execute(args) {
    const path = args[0];
    try {
      const content = await API.readFile(path);
      return {
        success: true,
        message: `Opened ${path} in edit workflow`,
        data: {
          type: 'edit-workflow',
          path,
          originalContent: content,
          currentContent: content,
          editHistory: [],
          pendingSuggestionId: null,
        },
      };
    } catch (err) {
      return { success: false, message: `Failed to open ${path}: ${err instanceof Error ? err.message : String(err)}` };
    }
  },

  async autocomplete(args) {
    if (args.length === 0) return API.listFiles();
    const dir = args[0].includes('/') ? args[0].split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = args[0].split('/').pop() || '';
    const items = await API.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },

  validate(args) {
    if (args.length === 0) return 'Usage: /edit <filepath>';
    return null;
  },
};

export { editCommand };
