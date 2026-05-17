import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

const api = {
  async move(src: string, dest: string): Promise<void> {
    const res = await fetch('/api/fs/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src, dest }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
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

const moveCommand: Command = {
  name: 'move',
  description: 'Move or rename a file/directory',
  aliases: ['mv', 'rename'],
  async execute(args) {
    const [src, dest] = args;
    try {
      await api.move(src, dest);
      return { success: true, message: `Moved ${src} → ${dest}` };
    } catch (err) {
      return { success: false, message: `Failed to move: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    if (args.length === 0) return api.listFiles();
    if (args.length === 1) {
      const prefix = args[0];
      const items = await api.listFiles();
      return items.filter((i) => i.value.startsWith(prefix));
    }
    return [];
  },
  validate(args) {
    if (args.length < 2) return 'Usage: /move <source> <destination>';
    return null;
  },
};

registry.register(moveCommand);
