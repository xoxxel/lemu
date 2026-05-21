import type { PluginAction } from '../../core/actions/types';
import { getRuntime } from '../../core/runtime/instance';

export const replaceAction: PluginAction = {
  id: 'replace',
  type: 'edit-workflow',
  title: 'Replace mode',
  description: 'Toggle interactive find-and-replace mode. Owns plain-text input while active.',
  handler: async (ctx) => {
    const runtime = getRuntime();
    const appCtx = runtime.getContext();
    const query = ctx.query.replace(/^replace\s*/, '').trim();
    const subcommand = query.toLowerCase();

    if (subcommand === 'off') {
      runtime.ownership.release('edit');
      appCtx.set('edit:replace:mode', false);
      appCtx.set('edit:replace:matchCount', 0);
      appCtx.set('edit:search:mode', false);
      appCtx.set('edit:search:execute', '');
      appCtx.set('action:suffix:replace', undefined);
      const s = appCtx.get<any>('edit:session');
      if (s && typeof s.clearSearch === 'function') s.clearSearch();
      appCtx.set('edit:replace:event', { type: 'mode_exited', text: 'Replace mode deactivated' });
      return 'Replace mode OFF';
    }

    if (runtime.ownership.isOwnedBy('edit')) {
      return 'Tab already in replace mode. Use >replace off to exit.';
    }

    runtime.ownership.acquire('edit', 'replace', 'edit-workflow', ctx.tabId);
    appCtx.set('edit:replace:mode', true);
    appCtx.set('edit:replace:matchCount', 0);
    appCtx.set('action:suffix:replace', '[on]');
    appCtx.set('edit:replace:event', { type: 'mode_entered', text: 'Replace mode active' });
    return 'Replace mode ON — type [scope]from=>to (press Enter to search, include => to replace)';
  },
};
