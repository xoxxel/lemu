import type { Command, AutocompleteItem } from '../../core/commands/types';

const agentCommand: Command = {
  name: 'agent',
  description: 'Run autonomous agent to complete a task',
  aliases: ['auto', 'workflow'],
  async execute(args) {
    if (args.length === 0) return { success: false, message: 'Usage: /agent <task description>' };

    const task = args.join(' ');
    const { runAgent } = await import('../../core/ai');
    return runAgent(task);
  },
  async autocomplete(args) {
    if (args.length === 0) {
      return [
        { value: 'fix ', description: 'Fix build/lint/issues automatically', type: 'arg' },
        { value: 'analyze ', description: 'Deep analysis of the project', type: 'arg' },
        { value: 'refactor ', description: 'Refactor code structure', type: 'arg' },
      ];
    }
    return [];
  },
  validate() { return null; },
};

export default agentCommand;
