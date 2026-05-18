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

function resolveDest(src: string, destArg: string | undefined): string {
  if (!destArg) {
    const hasDirSep = src.includes('/');
    const srcDir = hasDirSep ? src.split('/').slice(0, -1).join('/') : '';
    const srcName = src.split('/').pop() || src;
    const ext = srcName.includes('.') ? '.' + srcName.split('.').pop() : '';
    const base = ext ? srcName.slice(0, -ext.length) : srcName;
    const renamed = `${srcDir}${srcDir ? '/' : ''}${base}.backup${ext}`;
    return renamed.startsWith('/') ? renamed.slice(1) : renamed;
  }

  // ./ prefix means workspace root
  if (destArg.startsWith('./')) {
    return destArg.slice(2);
  }

  // Ends with / means target directory
  if (destArg.endsWith('/')) {
    const hasDirSep = src.includes('/');
    const srcName = src.split('/').pop() || src;
    const dir = destArg.replace(/\/+$/, '');
    return `${dir}/${srcName}`;
  }

  // Has a directory separator — explicit full path
  if (destArg.includes('/')) {
    return destArg;
  }

  // Bare filename — same directory as source
  const hasDirSep = src.includes('/');
  const srcDir = hasDirSep ? src.split('/').slice(0, -1).join('/') : '';
  return `${srcDir}${srcDir ? '/' : ''}${destArg}`;
}

const moveCommand: Command = {
  name: 'move',
  description: 'Move or rename a file/directory',
  aliases: ['mv', 'rename'],
  usage: '/move <source> <destination>',
  examples: [
    { input: '/move old.ts new.ts', description: 'Rename a file' },
    { input: '/mv temp.log logs/temp.log', description: 'Move to subdirectory' },
    { input: '/rename draft.md final.md', description: 'Rename using alias' },
    { input: '/move test/demo.md ./demo.md', description: 'Move to workspace root' },
    { input: '/move test/demo.md backups/', description: 'Move into directory' },
  ],
  edgeCases: [
    { scenario: 'missing destination', input: '/move file.ts', expected: 'Usage error' },
    { scenario: 'source not found', input: '/move nope.ts dest.ts', expected: 'error: ENOENT' },
    { scenario: 'path traversal', input: '/move ../../etc/passwd dest', expected: 'error: Path outside workspace' },
  ],
  async execute(args) {
    const [src, destArg] = args;
    try {
      const dest = resolveDest(src, destArg);
      await api.move(src, dest);
      return { success: true, message: `Moved ${src} → ${dest}` };
    } catch (err) {
      return { success: false, message: `Failed to move: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    if (args.length === 0) return api.listFiles();
    const index = args.length === 1 ? 0 : 1;
    const raw = args[index] || '';
    const dir = raw.includes('/') ? raw.split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = raw.split('/').pop() || '';
    const items = await api.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },
  validate(args) {
    if (args.length < 2) return 'Usage: /move <source> <destination>';
    return null;
  },
};

export default moveCommand;
