import type { Plugin, PluginContext, CommandExecutedPayload } from '../../core/plugin-system/types';
import openCommand from './open';
import copyCommand from './copy';
import moveCommand from './move';
import deleteCommand from './delete';

export const fsPlugin: Plugin = {
  id: 'fs',
  name: 'Filesystem',
  version: '0.1.0',
  description: 'File and directory operations (open, copy, move, delete)',
  commands: [openCommand, copyCommand, moveCommand, deleteCommand],
  docs: {
    overview: 'The Filesystem plugin provides basic file and directory operations. All operations go through the server REST API and are validated against path traversal attacks.',
    examples: '  /open package.json\n  /copy file.ts file.backup.ts\n  /move old.ts new.ts\n  /delete -f temp.log',
    workflows: '  1. View a file: /open <path>\n  2. Edit via shell: echo "content" > file.ts\n  3. Backup: /copy file.ts file.ts.bak\n  4. Cleanup: /delete -f temp.log',
    troubleshooting: '  "Path outside workspace" — the path resolved outside the allowed workspace directory.\n  "ENOENT" — the file or parent directory does not exist.\n  "EISDIR" — expected a file but got a directory.',
    tips: '  Use /open to quickly view files without leaving the keyboard.\n  /delete always requires -f flag as a safety measure.\n  Use tab completion for file paths.',
    limitations: '  No undo for delete. Once deleted with -f, the file is permanently removed.\n  No file watching — editor tabs show a snapshot, not live content.',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
  onCommandExecuted: async (payload: CommandExecutedPayload) => {
    if (['open', 'copy', 'move', 'delete'].includes(payload.command)) {
      payload.result.data = { ...(payload.result.data as Record<string, unknown> || {}), _tracked: true };
    }
  },
};
