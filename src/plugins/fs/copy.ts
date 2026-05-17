import type { Command, AutocompleteItem } from '../../core/commands/types';

const api = {
  async copy(src: string, dest: string): Promise<void> {
    const res = await fetch('/api/fs/copy', {
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

const copyCommand: Command = {
  name: 'copy',
  description: 'Copy a file or directory',
  aliases: ['cp'],
  usage: '/copy <source> <destination>',
  examples: [
    { input: '/copy file.ts file.backup.ts', description: 'Create a backup of a file' },
    { input: '/cp package.json package.backup.json', description: 'Copy using alias' },
  ],
  edgeCases: [
    { scenario: 'missing destination', input: '/copy file.ts', expected: 'Usage error' },
    { scenario: 'source not found', input: '/copy nope.ts dest.ts', expected: 'error: ENOENT' },
    { scenario: 'path traversal', input: '/copy ../../etc/passwd dest', expected: 'error: Path outside workspace' },
  ],
  async execute(args) {
    const [src, dest] = args;
    try {
      await api.copy(src, dest);
      return { success: true, message: `Copied ${src} → ${dest}` };
    } catch (err) {
      return { success: false, message: `Failed to copy: ${err instanceof Error ? err.message : String(err)}` };
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
    if (args.length < 2) return 'Usage: /copy <source> <destination>';
    return null;
  },
};

export default copyCommand;
