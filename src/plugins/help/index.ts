import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import helpCommand from './help';
import { HelpView } from './HelpView';

export const helpPlugin: Plugin = {
  id: 'help',
  name: 'Help System',
  version: '0.1.0',
  description: 'Built-in documentation and help system',
  commands: [helpCommand],
  actions: standardActions,
  views: [
    {
      type: 'help',
      component: HelpView,
      meta: { label: 'Help', icon: '?' },
    },
  ],
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
  docs: {
    overview: 'The Help System provides dynamically-generated documentation for all plugins and commands. Content is generated from plugin manifests, never hardcoded.',
    examples: '  /help\n  /help fs\n  /help open\n  /help search',
    workflows: '  1. Overview: /help\n  2. Plugin docs: /help <plugin-id>\n  3. Command docs: /help <command-name>\n  4. Contextual: type / and select from menu',
    troubleshooting: '  "No documentation found" — check the spelling. Use /help to see available topics.',
    tips: '  Use /help <plugin-id> to see workflows and troubleshooting for a plugin.\n  Use /help <command> to see examples and edge cases.\n  Commands also show usage hints in the autocomplete menu.',
    limitations: '  Documentation is as complete as plugin authors make it. Some plugins may have minimal docs.\n  The /terminal command is built-in to App.tsx and not included in plugin help.',
  },
};
