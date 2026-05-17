import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import taskCommand from './task';

export const taskPlugin: Plugin = {
  id: 'task',
  name: 'Task Manager',
  version: '0.1.0',
  description: 'Manage tasks (list, add, complete, remove)',
  commands: [taskCommand],
  actions: standardActions,
  tabTypes: ['task'],
  docs: {
    overview: 'An in-memory task manager for tracking work items during a development session. Supports adding, listing, completing, and removing tasks.',
    examples: '  /task add Fix login bug\n  /task list\n  /task done 1712345678901\n  /task remove 1712345678901\n  /todo add Write tests',
    workflows: '  1. Add tasks as you think of them: /task add <desc>\n  2. Review all tasks: /task list\n  3. Mark done: /task done <id>\n  4. Remove obsolete: /task remove <id>',
    troubleshooting: '  "Task not found" — check the task ID with /task list. IDs are timestamps.\n  Tasks are matched by full ID or description prefix.',
    tips: '  Use /todo alias for faster adding.\n  Review tasks before ending a session — they are not persisted.\n  Use /task list to see completed [x] and pending [ ] tasks.',
    limitations: '  In-memory only — all tasks are lost on page refresh.\n  No due dates, priorities, or categories.\n  Task IDs are Unix timestamps (not human-friendly).',
  },
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
