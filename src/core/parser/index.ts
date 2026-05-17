import type { ParsedCommand } from '../commands/types';

export function parse(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/') && !trimmed.startsWith('!')) return null;

  const raw = trimmed;

  if (trimmed.startsWith('!')) {
    const result = {
      name: 'run',
      args: [trimmed.slice(1).trim()],
      raw,
    };
    console.log('[PARSER] !-prefix command:', JSON.stringify(result));
    return result;
  }

  const parts = trimmed.slice(1).split(' ');
  const name = parts[0].toLowerCase();
  const args = parts.slice(1).filter((a) => a.length > 0);

  const result = { name, args, raw };
  console.log('[PARSER] input=%s type=command name=%s args=%j', input, name, args);
  return result;
}

export function isCommandInput(input: string): boolean {
  return input.startsWith('/') || input.startsWith('!') || input.startsWith('@') || input.startsWith('>');
}

export function isSlashCommand(input: string): boolean {
  const r = input.trim().startsWith('/');
  console.log('[PARSER] isSlashCommand(%s) => %s', input, r);
  return r;
}

export function isShellCommand(input: string): boolean {
  const trimmed = input.trim();
  const r = trimmed.length > 0 && !trimmed.startsWith('/') && !trimmed.startsWith('!');
  console.log('[PARSER] isShellCommand(%s) => %s', input, r);
  return r;
}
