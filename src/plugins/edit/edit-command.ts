import type { Command, AutocompleteItem } from '../../core/commands/types';
import { getRuntime } from '../../core/runtime/instance';

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
  description: 'Open a file or toggle AI mode. /edit ai on / off for AI-assisted editing',
  aliases: ['e', 'modify'],
  usage: '/edit <filepath>  |  /edit ai on  |  /edit ai off',
  examples: [
    { input: '/edit README.md', description: 'Open file for editing with workflow support' },
    { input: '/edit ai on', description: 'Activate AI mode for the current file' },
    { input: '/edit ai off', description: 'Deactivate AI mode' },
  ],
  edgeCases: [
    { scenario: 'file not found', input: '/edit nope.ts', expected: 'error with ENOENT description' },
    { scenario: 'path traversal', input: '/edit ../../etc/passwd', expected: 'error: Path outside workspace' },
  ],

  async execute(args) {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();

    /* ── AI mode subcommand ── */
    if (args[0]?.toLowerCase() === 'ai') {
      const sub = args[1]?.toLowerCase();

      if (sub === 'on') {
        const editorPath = runtime.editorContext.path;
        if (!editorPath) {
          return { success: false, message: 'No file open. Use /edit <filepath> first, then /edit ai on.' };
        }

        if (runtime.ownership.hasOwner() && !runtime.ownership.isOwnedBy('edit')) {
          return { success: false, message: 'Another plugin holds ownership. Exit their mode first.' };
        }

        /* release any existing edit ownership (e.g. from >find), then acquire for AI mode */
        if (runtime.ownership.isOwnedBy('edit')) {
          runtime.ownership.release('edit');
        }
        const acquired = runtime.ownership.acquire('edit', 'ai-mode', 'edit-workflow', null);
        if (!acquired) {
          return { success: false, message: 'Failed to acquire ownership for AI mode.' };
        }

        appCtx.set('edit:ai:active', true);
        appCtx.set('edit:ai:messages', []);
        appCtx.set('edit:ai:patches', []);

        return {
          success: true,
          message: `AI mode ON for ${editorPath}. Type prompts as plain text to generate edits. /edit ai off to exit.`,
        };
      }

      if (sub === 'off') {
        runtime.ownership.release('edit');
        appCtx.set('edit:ai:active', false);
        appCtx.set('edit:ai:messages', []);
        appCtx.set('edit:ai:patches', []);
        return { success: true, message: 'AI mode OFF.' };
      }

      return {
        success: false,
        message: 'Usage: /edit ai on  |  /edit ai off',
      };
    }

    /* ── File open (existing behavior) ── */
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
    if (args[0]?.toLowerCase() === 'ai') return [];
    if (args.length === 0) return API.listFiles();
    const dir = args[0].includes('/') ? args[0].split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = args[0].split('/').pop() || '';
    const items = await API.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },

  validate(args) {
    if (args.length === 0) return 'Usage: /edit <filepath>  |  /edit ai on  |  /edit ai off';
    return null;
  },
};

export { editCommand };
