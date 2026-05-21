import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

export const replaceAction: PluginAction = {
  id: 'replace',
  type: 'edit-workflow',
  title: 'Replace mode',
  description: 'Toggle interactive find-and-replace mode. Owns plain-text input while active.',
  ownsInput: true,
  handler: async (ctx) => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const replaceMode = appCtx.get<boolean>('edit:replace:mode') ?? false;
    const query = ctx.query.replace(/^replace\s*/, '').trim();
    const subcommand = query.toLowerCase();

    if (subcommand === 'off') {
      runtime.ownership.release('edit');
      appCtx.set('edit:replace:mode', false);
      appCtx.set('edit:replace:matchCount', 0);
      appCtx.set('edit:search:mode', false);
      appCtx.set('action:suffix:replace', undefined);
      return 'Replace mode OFF';
    }

    if (replaceMode) {
      return 'Tab already in replace mode. Use >replace off to exit.';
    }

    runtime.ownership.acquire('edit', 'replace', 'edit-workflow', ctx.tabId);
    appCtx.set('edit:replace:mode', true);
    appCtx.set('edit:replace:matchCount', 0);
    appCtx.set('action:suffix:replace', '[on]');
    return 'Replace mode ON — type [scope]from=>to (press Enter to search, include => to replace)';
  },
};
