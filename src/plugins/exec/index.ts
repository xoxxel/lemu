import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import runCommand from './run';

export const execPlugin: Plugin = {
  id: 'exec',
  name: 'Command Execution',
  version: '0.1.0',
  description: 'Execute shell commands',
  commands: [runCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
