import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

const browserCommand: Command = {
  name: 'browser',
  description: 'Preview an HTML file in the embedded browser',
  aliases: ['browse', 'preview'],
  async execute(args) {
    const path = args[0];
    return {
      success: true,
      message: `Opening ${path} in preview`,
      data: { type: 'browser', path },
    };
  },
  async autocomplete(args) {
    if (args.length === 0) {
      return [{ value: 'index.html', description: 'Open index.html', type: 'file' }];
    }
    return [];
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /browser <filepath>';
    return null;
  },
};

registry.register(browserCommand);
