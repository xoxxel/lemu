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
