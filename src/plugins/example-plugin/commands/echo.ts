import type { Command } from '../../../core/commands/types';

export const echoCommand: Command = {
  name: 'echo',
  description: 'Echo back the provided text',
  aliases: ['say', 'repeat'],
  usage: '/echo <text>',
  async execute(args: string[]) {
    const text = args.join(' ') || 'Hello, lemu!';
    return {
      success: true,
      message: text,
      data: args.length > 0
        ? { type: 'example-output', text }
        : undefined,
    };
  },
  async autocomplete(args: string[]) {
    if (args.length === 0) {
      return [{ value: 'hello', description: 'Simple greeting', type: 'arg' }];
    }
    return [];
  },
  validate(args: string[]) {
    return null;
  },
};
