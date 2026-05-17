import type { Command, AutocompleteItem } from '../../core/commands/types';

const api = {
  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const res = await fetch('/api/shell/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: `git ${command}` }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return { stdout: data.stdout, stderr: data.stderr, code: data.code };
  },
};

const gitCommand: Command = {
  name: 'git',
  description: 'Run git commands',
  aliases: ['g'],
  async execute(args) {
    const cmd = args.join(' ');
    try {
      const result = await api.exec(cmd);
      const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
      return {
        success: result.code === 0,
        message: output || `git ${cmd} completed (exit ${result.code})`,
        data: { type: 'shell', command: `git ${cmd}`, ...result },
      };
    } catch (err) {
      return { success: false, message: `git failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async autocomplete(args) {
    const subcommands = ['status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'log', 'diff', 'merge', 'clone', 'stash', 'tag', 'fetch', 'rebase'];
    if (args.length === 0) {
      return subcommands.map((s) => ({ value: s, description: `git ${s}`, type: 'arg' as const }));
    }
    if (args.length === 1) {
      return subcommands.filter((s) => s.startsWith(args[0])).map((s) => ({ value: s, description: `git ${s}`, type: 'arg' as const }));
    }
    return [];
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /git <subcommand> [args...]';
    return null;
  },
};

export default gitCommand;
