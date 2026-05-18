import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import gitCommand from './git';
import { GitView } from './GitView';

export const gitPlugin: Plugin = {
  id: 'git',
  name: 'Git Integration',
  version: '0.1.0',
  description: 'Run git commands from the terminal',
  commands: [gitCommand],
  actions: standardActions,
  views: [
    {
      type: 'git',
      component: GitView,
      meta: { label: 'Git', icon: '\uD83D\uDC65' },
    },
  ],
  docs: {
    overview: 'Run git commands non-interactively through the shell exec API. Prefixes arguments with "git" and executes them synchronously.',
    examples: '  /git status\n  /git add -A\n  /git commit -m "message"\n  /git log --oneline -5\n  /g diff',
    workflows: '  1. Check status: /git status\n  2. Stage: /git add -A\n  3. Commit: /git commit -m "feat: ..."\n  4. Push: /git push origin main',
    troubleshooting: '  "fatal: not a git repository" — the workspace is not a git repo.\n  For interactive git (merge, rebase, credential prompts), use plain git commands without the / prefix.',
    tips: '  Use /git for quick status and commits.\n  Use plain shell commands (no / prefix) for interactive operations like merge, rebase, or when credentials are needed.',
    limitations: '  Non-interactive — cannot handle prompts (merge conflicts, credentials).\n  Uses execSync (blocking on server).\n  Output is all-at-once, not streamed.',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
