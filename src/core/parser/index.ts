import type { ParsedCommand } from '../commands/types';

export function parse(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/') && !trimmed.startsWith('!')) return null;

  const raw = trimmed;

  if (trimmed.startsWith('!')) {
    return {
      name: 'run',
      args: [trimmed.slice(1).trim()],
      raw,
    };
  }

  const parts = trimmed.slice(1).split(' ');
  const name = parts[0].toLowerCase();
  const args = parts.slice(1).filter((a) => a.length > 0);

  return { name, args, raw };
}

export function isCommandInput(input: string): boolean {
  return input.startsWith('/') || input.startsWith('!');
}
