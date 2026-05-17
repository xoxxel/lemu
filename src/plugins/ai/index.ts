import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import aiCommand from './ai-cmd';
import agentCommand from './agent-cmd';

export const aiPlugin: Plugin = {
  id: 'ai',
  name: 'AI Integration',
  version: '0.1.0',
  description: 'AI and agent commands',
  commands: [aiCommand, agentCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
