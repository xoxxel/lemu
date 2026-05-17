import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import searchCommand from './search';

export const searchPlugin: Plugin = {
  id: 'search',
  name: 'Code Search',
  version: '0.1.0',
  description: 'Search file contents for patterns',
  commands: [searchCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
