import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import browserCommand from './browser';

export const browserPlugin: Plugin = {
  id: 'browser',
  name: 'Browser Preview',
  version: '0.1.0',
  description: 'Preview HTML files in an embedded browser',
  commands: [browserCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
