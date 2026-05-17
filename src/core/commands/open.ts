import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

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
  async execute(args) {
    const path = args[0];
    try {
      const content = await api.readFile(path);
      return {
        success: true,
        message: `Opened ${path}`,
        data: { path, content, type: 'file' },
      };
    } catch (err) {
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

registry.register(openCommand);
