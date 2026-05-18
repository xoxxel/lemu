import type { Command, AutocompleteItem } from '../../core/commands/types';

const agentCommand: Command = {
  name: 'agent',
  description: 'Run autonomous agent to complete a task',
  aliases: ['auto', 'workflow'],
  usage: '/agent <task description>',
  examples: [
    { input: '/agent fix the build errors', description: 'Autonomous fix of build issues' },
    { input: '/agent analyze the project architecture', description: 'Deep project analysis' },
    { input: '/auto refactor the parser', description: 'Run using alias' },
  ],
  edgeCases: [
    { scenario: 'not configured', input: '/agent fix bugs', expected: 'error: No API key configured' },
    { scenario: 'no description', input: '/agent', expected: 'Usage error' },
    { scenario: 'max iterations', input: '/agent complex task', expected: 'completes with max iterations reached' },
  ],
  async execute(args) {
    if (args.length === 0) return { success: false, message: 'Usage: /agent <task description>' };

    const task = args.join(' ');
    const { runAgent } = await import('../../core/ai');
    const result = await runAgent(task);
    if (result.success && result.data) {
      return { ...result, data: { type: 'agent', ...result.data as Record<string, unknown> } };
    }
    return result;
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
