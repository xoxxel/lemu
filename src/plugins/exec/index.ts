import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import runCommand from './run';
import { ExecView } from './ExecView';

export const execPlugin: Plugin = {
  id: 'exec',
  name: 'Command Execution',
  version: '0.1.0',
  description: 'Execute shell commands',
  commands: [runCommand],
  actions: standardActions,
  views: [
    {
      type: 'exec',
      component: ExecView,
      meta: { label: 'Output', icon: '\u25B6' },
    },
  ],
  docs: {
    overview: 'Execute shell commands non-interactively via the server exec API. The command runs synchronously and returns stdout/stderr all at once.',
    examples: '  /run npm test\n  /run ls -la\n  !echo hello\n  /run node -e "console.log(1+1)"',
    workflows: '  1. Quick exec: !npm --version\n  2. Run tests: /run npm test\n  3. Run build: /run npm run build\n  For interactive commands (vim, python), omit the / prefix.',
    troubleshooting: '  Commands that need stdin (interactive) will hang — use plain shell commands instead.\n  "command not found" — the shell on the server may not have the command.\n  Use /run for one-off commands; use plain prefix for long-running processes.',
    tips: '  Use ! shorthand for quick commands: !npm test\n  Use /run for commands where you only need the final output.\n  Use no prefix for interactive or long-running commands (they use the PTY terminal).',
    limitations: '  Non-interactive — cannot handle stdin prompts.\n  Uses execSync (blocking) — long commands block the server.\n  Output is all-at-once, not streamed.',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
