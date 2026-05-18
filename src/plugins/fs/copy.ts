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

function resolveDest(src: string, destArg: string | undefined): string {
  const hasDirSep = src.includes('/');
  const srcDir = hasDirSep ? src.split('/').slice(0, -1).join('/') : '';
  const srcName = src.split('/').pop() || src;

  // No destination: duplicate in-place
  if (!destArg) {
    const ext = srcName.includes('.') ? '.' + srcName.split('.').pop() : '';
    const base = ext ? srcName.slice(0, -ext.length) : srcName;
    const dupe = `${srcDir}${srcDir ? '/' : ''}${base}-copy${ext}`;
    return dupe.startsWith('/') ? dupe.slice(1) : dupe;
  }

  // ./ prefix means workspace root
  if (destArg.startsWith('./')) {
    return destArg.slice(2);
  }

  // Ends with / means target directory
  if (destArg.endsWith('/')) {
    const dir = destArg.replace(/\/+$/, '');
    return `${dir}/${srcName}`;
  }

  // Has a directory separator — explicit full path
  if (destArg.includes('/')) {
    return destArg;
  }

  // Bare filename — same directory as source
  return `${srcDir}${srcDir ? '/' : ''}${destArg}`;
}

const copyCommand: Command = {
  name: 'copy',
  description: 'Duplicate a file',
  aliases: ['cp'],
  usage: '/copy <source> [destination]',
  examples: [
    { input: '/copy test/demo.md', description: 'Duplicate in place → test/demo-copy.md' },
    { input: '/copy test/demo.md backup.md', description: 'Rename in same directory → test/backup.md' },
    { input: '/copy test/demo.md backups/', description: 'Copy into directory → backups/demo.md' },
    { input: '/copy test/demo.md backups/demo.backup.md', description: 'Explicit full target path' },
    { input: '/copy test/demo.md ./demo.backup.md', description: 'Copy to workspace root' },
  ],
  edgeCases: [
    { scenario: 'missing destination', input: '/copy file.ts', expected: 'Duplicates as file-copy.ts in same directory' },
    { scenario: 'source not found', input: '/copy nope.ts dest.ts', expected: 'error: ENOENT' },
    { scenario: 'path traversal', input: '/copy ../../etc/passwd dest', expected: 'error: Path outside workspace' },
  ],
  async execute(args) {
    const [src, destArg] = args;
    try {
      const dest = resolveDest(src, destArg);
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
    if (args.length < 1) return 'Usage: /copy <source> [destination]';
    return null;
  },
};

export default copyCommand;
