import type { Command, AutocompleteItem } from '../../core/commands/types';

interface TaskItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

const tasks: TaskItem[] = [];

const taskCommand: Command = {
  name: 'task',
  description: 'Manage tasks (list, add, done, remove)',
  aliases: ['todo', 'tasks'],
  usage: '/task [list|add <desc>|done <id>|remove <id>]',
  examples: [
    { input: '/task add Fix login bug', description: 'Add a new task' },
    { input: '/task list', description: 'List all tasks' },
    { input: '/task done 1712345678901', description: 'Mark task as completed' },
    { input: '/task remove 1712345678901', description: 'Remove a task' },
    { input: '/todo add Write tests', description: 'Add using alias' },
  ],
  edgeCases: [
    { scenario: 'no tasks', input: '/task list', expected: 'No tasks.' },
    { scenario: 'add without description', input: '/task add', expected: 'Usage error' },
    { scenario: 'done with invalid id', input: '/task done 999', expected: 'Task not found: 999' },
    { scenario: 'in-memory only', input: 'refresh page', expected: 'All tasks lost' },
  ],
  async execute(args) {
    const sub = args[0];

    if (!sub || sub === 'list') {
      if (tasks.length === 0) return { success: true, message: 'No tasks.' };
      const list = tasks
        .map((t) => `  [${t.status === 'completed' ? 'x' : ' '}] ${t.id}: ${t.description}`)
        .join('\n');
      return { success: true, message: `Tasks:\n${list}`, data: { type: 'task', tasks: [...tasks] } };
    }

    if (sub === 'add') {
      const desc = args.slice(1).join(' ');
      if (!desc) return { success: false, message: 'Usage: /task add <description>' };
      const id = String(Date.now());
      tasks.push({ id, description: desc, status: 'pending' });
      return { success: true, message: `Task added: ${desc}` };
    }

    if (sub === 'done' || sub === 'complete') {
      const id = args[1];
      const task = tasks.find((t) => t.id === id || t.description.startsWith(id));
      if (!task) return { success: false, message: `Task not found: ${id}` };
      task.status = 'completed';
      return { success: true, message: `Task completed: ${task.description}` };
    }

    if (sub === 'remove' || sub === 'rm') {
      const id = args[1];
      const idx = tasks.findIndex((t) => t.id === id || t.description.startsWith(id));
      if (idx === -1) return { success: false, message: `Task not found: ${id}` };
      const removed = tasks.splice(idx, 1)[0];
      return { success: true, message: `Task removed: ${removed.description}` };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /task [list|add|done|remove]` };
  },
  async autocomplete(args) {
    if (args.length === 0) {
      return [
        { value: 'list', description: 'List all tasks', type: 'arg' },
        { value: 'add', description: 'Add a new task', type: 'arg' },
        { value: 'done', description: 'Mark task as completed', type: 'arg' },
        { value: 'remove', description: 'Remove a task', type: 'arg' },
      ];
    }
    if ((args[0] === 'done' || args[0] === 'remove') && args.length === 1) {
      return tasks
        .filter((t) => t.status !== 'completed')
        .map((t) => ({ value: t.id, description: t.description, type: 'arg' as const }));
    }
    return [];
  },
  validate(args) {
    return null;
  },
};

export default taskCommand;
