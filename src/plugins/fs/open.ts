import type { Command, AutocompleteItem } from '../../core/commands/types';

const api = {
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

const openCommand: Command = {
  name: 'open',
  description: 'Open and display a file',
  aliases: ['o', 'cat', 'view'],
  usage: '/open <filepath>',
  examples: [
    { input: '/open package.json', description: 'Open file from workspace root' },
    { input: '/open src/App.tsx', description: 'Open file in subdirectory' },
    { input: '/o README.md', description: 'Open using alias' },
  ],
  edgeCases: [
    { scenario: 'file not found', input: '/open nope.ts', expected: 'error with ENOENT description' },
    { scenario: 'path traversal', input: '/open ../../etc/passwd', expected: 'error: Path outside workspace' },
    { scenario: 'directory instead of file', input: '/open src', expected: 'error: EISDIR' },
  ],
  async execute(args) {
    const path = args[0];
    console.log('[CMD_OPEN] execute() path=%s', path);
    try {
      const content = await api.readFile(path);
      console.log('[CMD_OPEN] readFile success, content length=%d', content.length);
      return {
        success: true,
        message: `Opened ${path}`,
        data: { path, content, type: 'file' },
      };
    } catch (err) {
      console.log('[CMD_OPEN] FAILED: %s', err instanceof Error ? err.message : String(err));
      return { success: false, message: `Failed to open ${path}: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    if (args.length === 0) return api.listFiles();
    const dir = args[0].includes('/') ? args[0].split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = args[0].split('/').pop() || '';
    const items = await api.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /open <filepath>';
    return null;
  },
};

export default openCommand;
