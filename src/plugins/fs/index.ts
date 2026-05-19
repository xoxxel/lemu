import type { Plugin, CommandExecutedPayload } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import { eventBus, DomainEventTypes } from '../../core/events';
import openCommand from './open';
import copyCommand from './copy';
import moveCommand from './move';
import deleteCommand from './delete';
import { EditorView } from './EditorView';
import { fsManifest } from './manifest';
import { fsDefaultSettings, fsSettingsSchema } from './settings';

export const fsPlugin: Plugin = {
  id: 'fs',
  name: 'Filesystem',
  version: '0.1.0',
  description: 'File and directory operations (open, copy, move, delete)',
  commands: [openCommand, copyCommand, moveCommand, deleteCommand],
  actions: standardActions,
  views: [
    {
      type: 'editor',
      component: EditorView,
      meta: { label: 'Editor', icon: '\uD83D\uDCC4' },
    },
  ],
  manifest: fsManifest,
  settings: fsDefaultSettings,
  settingsSchema: fsSettingsSchema,
  docs: {
    overview: 'The Filesystem plugin provides basic file and directory operations. All operations go through the server REST API and are validated against path traversal attacks.',
    examples: '  /open package.json\n  /copy file.ts file.backup.ts\n  /move old.ts new.ts\n  /delete -f temp.log',
    workflows: '  1. View a file: /open <path>\n  2. Edit via shell: echo "content" > file.ts\n  3. Backup: /copy file.ts file.ts.bak\n  4. Cleanup: /delete -f temp.log',
    troubleshooting: '  "Path outside workspace" — the path resolved outside the allowed workspace directory.\n  "ENOENT" — the file or parent directory does not exist.\n  "EISDIR" — expected a file but got a directory.',
    tips: '  Use /open to quickly view files without leaving the keyboard.\n  /delete always requires -f flag as a safety measure.\n  Use tab completion for file paths.',
    limitations: '  No undo for delete. Once deleted with -f, the file is permanently removed.\n  No file watching — editor tabs show a snapshot, not live content.',
  },
  onCommandExecuted: async (payload: CommandExecutedPayload) => {
    const { command, args, result } = payload;

    if (command === 'copy') {
      eventBus.emit(DomainEventTypes.FsCopied, {
        timestamp: Date.now(),
        source: args[0],
        destination: args[1] || '(in-place)',
        success: result.success,
        error: result.success ? undefined : result.message,
      });
      eventBus.emit('fs:copy', { timestamp: Date.now(), source: args[0], destination: args[1] || '(in-place)', success: result.success, error: result.success ? undefined : result.message });
      return;
    }

    if (command === 'move') {
      eventBus.emit(DomainEventTypes.FsMoved, {
        timestamp: Date.now(),
        from: args[0],
        to: args[1],
        success: result.success,
        error: result.success ? undefined : result.message,
      });
      eventBus.emit('fs:move', { timestamp: Date.now(), from: args[0], to: args[1], success: result.success, error: result.success ? undefined : result.message });
      return;
    }

    if (command === 'delete') {
      const cleanPath = (result.data as Record<string, unknown> | undefined)?.path as string | undefined
        || args.filter(a => !a.startsWith('-'))[0]
        || args[0];
      const name = cleanPath.split('/').pop() || cleanPath;

      if (result.success) {
        const kind = (result.data as Record<string, unknown> | undefined)?.kind as string | undefined || 'file';
        eventBus.emit(DomainEventTypes.FsDeleted, { timestamp: Date.now(), path: cleanPath, name, kind: kind as 'file' | 'directory', success: true });
        eventBus.emit('fs:delete', { timestamp: Date.now(), path: cleanPath, name, kind: kind as 'file' | 'directory', success: true });
      } else {
        eventBus.emit(DomainEventTypes.FsError, { timestamp: Date.now(), operation: 'delete', path: cleanPath, message: result.message });
        eventBus.emit('fs:error', { timestamp: Date.now(), operation: 'delete', path: cleanPath, message: result.message });
      }
      return;
    }

    if (command === 'open' && result.success) {
      eventBus.emit(DomainEventTypes.FsOpened, { timestamp: Date.now(), path: args[0] });
      eventBus.emit('fs:open', { timestamp: Date.now(), path: args[0] });
      return;
    }

    if (['open', 'copy', 'move', 'delete'].includes(payload.command)) {
      payload.result.data = { ...(payload.result.data as Record<string, unknown> || {}), _tracked: true };
    }
  },
};
