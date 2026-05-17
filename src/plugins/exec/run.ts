import type { Command, AutocompleteItem } from '../../core/commands/types';

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
  usage: '/run <command> or !<command>',
  examples: [
    { input: '/run npm test', description: 'Run npm tests' },
    { input: '!echo hello', description: 'Quick exec using shorthand' },
    { input: '/run node -e "console.log(1+1)"', description: 'Run inline script' },
  ],
  edgeCases: [
    { scenario: 'command not found', input: '/run xyzzy', expected: 'error: command not found' },
    { scenario: 'non-zero exit', input: '/run exit 1', expected: 'stderr with exit code' },
    { scenario: 'empty command', input: '/run', expected: 'depends on shell behavior' },
  ],
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

export default runCommand;
