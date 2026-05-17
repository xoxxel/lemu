import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import taskCommand from './task';

export const taskPlugin: Plugin = {
  id: 'task',
  name: 'Task Manager',
  version: '0.1.0',
  description: 'Manage tasks (list, add, complete, remove)',
  commands: [taskCommand],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
    ctx.storage.set('plugin:task:loaded', true);
  },
  onConfig: async (config) => {
    return { ...config, maxTasks: config.maxTasks ?? 100 };
  },
  onReady: async (ctx) => {
    ctx.events.emit('task:ready', { status: 'ready' });
  },
  onCleanup: async () => {
    // persist tasks if needed
  },
};
