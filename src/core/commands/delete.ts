import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

const api = {
  async delete(path: string): Promise<void> {
    const res = await fetch('/api/fs/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
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

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a file or directory (requires confirmation)',
  aliases: ['rm', 'del', 'remove'],
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
      await api.delete(cleanArgs[0]);
      return { success: true, message: `Deleted ${path}` };
    } catch (err) {
      return { success: false, message: `Failed to delete: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    const clean = args.filter((a) => !a.startsWith('-'));
    if (clean.length === 0) return api.listFiles();
    const prefix = clean[0];
    const items = await api.listFiles();
    return items.filter((i) => i.value.startsWith(prefix));
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /delete [-f] <path>';
    return null;
  },
};

registry.register(deleteCommand);
