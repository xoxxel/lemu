export type InputMode = 'command' | 'action' | 'help' | 'terminal' | 'tab';

export interface ClassifiedInput {
  mode: InputMode;
  input: string;
  raw: string;
}

export function classifyInput(raw: string): ClassifiedInput {
  const trimmed = raw.trim();
  if (!trimmed) return { mode: 'tab', input: '', raw };

  if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
    return { mode: 'command', input: trimmed, raw };
  }

  if (trimmed.startsWith('>')) {
    return { mode: 'action', input: trimmed.slice(1).trim(), raw };
  }

  if (trimmed.startsWith('@')) {
    return { mode: 'help', input: trimmed.slice(1).trim(), raw };
  }

  if (trimmed.startsWith(':')) {
    return { mode: 'terminal', input: trimmed.slice(1).trimStart(), raw };
  }

  return { mode: 'tab', input: trimmed, raw };
}
