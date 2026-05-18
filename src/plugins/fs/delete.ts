import type { Command, AutocompleteItem } from '../../core/commands/types';

const api = {
  async delete(path: string): Promise<{ kind: string }> {
    const res = await fetch('/api/fs/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { kind: data.kind };
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

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a file or directory (requires confirmation)',
  aliases: ['rm', 'del', 'remove'],
  usage: '/delete [-f] <path>',
  examples: [
    { input: '/delete -f temp.log', description: 'Delete a file' },
    { input: '/rm -f old-file.ts', description: 'Delete using alias' },
    { input: '/delete -f node_modules', description: 'Delete directory recursively' },
  ],
  edgeCases: [
    { scenario: 'safety prompt without -f', input: '/delete temp.log', expected: 'confirmation message, not deleted' },
    { scenario: 'file not found', input: '/delete -f nope.ts', expected: 'error: ENOENT' },
    { scenario: 'path traversal', input: '/delete -f ../../etc', expected: 'error: Path outside workspace' },
  ],
  async execute(args) {
    const path = args[0];
    const force = args.includes('-f') || args.includes('--force');
    if (!force) {
      return {
        success: false,
        message: `Confirm deletion of ${path}? Use /delete -f ${path} to force.`,
        data: { needsConfirm: true, path },
      };
    }
    try {
      const cleanArgs = args.filter((a) => a !== '-f' && a !== '--force');
      const { kind } = await api.delete(cleanArgs[0]);
      return { success: true, message: `Deleted ${path}`, data: { path: cleanArgs[0], kind } };
    } catch (err) {
      return { success: false, message: `Failed to delete: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    const clean = args.filter((a) => !a.startsWith('-'));
    if (clean.length === 0) return api.listFiles();
    const raw = clean[0];
    const dir = raw.includes('/') ? raw.split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = raw.split('/').pop() || '';
    const items = await api.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /delete [-f] <path>';
    return null;
  },
};

export default deleteCommand;
