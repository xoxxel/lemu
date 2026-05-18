import type { Plugin, PluginContext } from '../../core/plugin-system/types';

export const feedbackPlugin: Plugin = {
  id: 'feedback',
  name: 'Command Feedback',
  version: '0.1.0',
  description: 'Global command feedback system',
  async activate(_ctx: PluginContext) {
    console.log('[FEEDBACK] Plugin initialized');
  },
};
