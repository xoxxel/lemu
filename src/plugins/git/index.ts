import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import gitCommand from './git';

export const gitPlugin: Plugin = {
  id: 'git',
  name: 'Git Integration',
  version: '0.1.0',
  description: 'Run git commands from the terminal',
  commands: [gitCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
