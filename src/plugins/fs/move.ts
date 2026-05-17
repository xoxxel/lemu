import type { Command, AutocompleteItem } from '../../core/commands/types';

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
  usage: '/move <source> <destination>',
  examples: [
    { input: '/move old.ts new.ts', description: 'Rename a file' },
    { input: '/mv temp.log logs/temp.log', description: 'Move to subdirectory' },
    { input: '/rename draft.md final.md', description: 'Rename using alias' },
  ],
  edgeCases: [
    { scenario: 'missing destination', input: '/move file.ts', expected: 'Usage error' },
    { scenario: 'source not found', input: '/move nope.ts dest.ts', expected: 'error: ENOENT' },
    { scenario: 'move to different filesystem', input: '/move file.ts /different/fs/dest', expected: 'may fail or copy+delete' },
  ],
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
      const raw = args[0];
      const dir = raw.includes('/') ? raw.split('/').slice(0, -1).join('/') || '.' : '.';
      const prefix = raw.split('/').pop() || '';
      const items = await api.listFiles(dir);
      return items.filter((i) => i.value.startsWith(prefix));
    }
    return [];
  },
  validate(args) {
    if (args.length < 2) return 'Usage: /move <source> <destination>';
    return null;
  },
};

export default moveCommand;
