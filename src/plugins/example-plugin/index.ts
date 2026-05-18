import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import type { PluginAction } from '../../core/actions/types';
import { echoCommand } from './commands/echo';
import ExampleView from './views/ExampleView';

const exampleAction: PluginAction = {
  id: 'example-reset',
  title: 'Reset Output',
  description: 'Clear the example output and start fresh',
  handler: async () => {
    return 'Example output reset. Type /echo to try again.';
  },
};

export const examplePlugin: Plugin = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '0.1.0',
  description: 'Canonical example plugin for the lemu SDK',

  commands: [echoCommand],
  views: [
    {
      type: 'example-output',
      component: ExampleView,
      meta: {
        label: 'Example',
        icon: '\u2728',
      },
    },
  ],
  tabTypes: ['example-output'],
  actions: [exampleAction],

  async activate(ctx: PluginContext) {
    console.log('[EXAMPLE] Plugin activated');
    ctx.events.on('example-plugin:ping', () => {
      ctx.feedback.info('Pong! Plugin is alive.');
    });
  },

  async onReady() {
    console.log('[EXAMPLE] Plugin is ready');
  },

  async onCleanup() {
    console.log('[EXAMPLE] Plugin cleaned up');
  },

  docs: {
    overview: 'Canonical example plugin demonstrating the lemu plugin SDK.',
    examples: [
      '  /echo              Say hello',
      '  /echo hello world  Echo custom text',
      '  /say hi            Using an alias',
    ].join('\n'),
    workflows: '  1. Type /echo to see a greeting\n  2. Type /echo <your text> to echo custom text\n  3. Check @example-plugin for this help',
    troubleshooting: '  If commands are not found, run npm run build.',
    tips: '  Use /say as a shortcut for /echo.',
  },
};
