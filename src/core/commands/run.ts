import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

const api = {
  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const res = await fetch('/api/shell/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { stdout: data.stdout, stderr: data.stderr, code: data.code };
  },
};

const runCommand: Command = {
  name: 'run',
  description: 'Execute a shell command',
  aliases: ['exec', '!'],
  async execute(args) {
    const cmd = args.join(' ');
    try {
      const result = await api.exec(cmd);
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
      return {
        success: result.code === 0,
        message: output || `Command completed with exit code ${result.code}`,
        data: { type: 'shell', command: cmd, ...result },
      };
    } catch (err) {
      return { success: false, message: `Command failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    return args.length === 0
      ? [
          { value: 'npm ', description: 'Node package manager', type: 'arg' },
          { value: 'git ', description: 'Version control', type: 'arg' },
          { value: 'node ', description: 'Node.js runtime', type: 'arg' },
          { value: 'ls', description: 'List directory', type: 'arg' },
          { value: 'cat ', description: 'Print file', type: 'arg' },
        ]
      : [];
  },
  validate() {
    return null;
  },
};

registry.register(runCommand);
