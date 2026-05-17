import type { Command, AutocompleteItem } from './types';
import { registry } from './registry';

const browserCommand: Command = {
  name: 'browser',
  description: 'Preview an HTML file in the embedded browser',
  aliases: ['browse', 'preview', 'open'],
  async execute(args) {
    const path = args[0] || 'index.html';
    const apiRes = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
    const data = await apiRes.json();
    if (!data.success) {
      return { success: false, message: `Cannot preview ${path}: ${data.error}` };
    }
    return {
      success: true,
      message: `Previewing ${path}`,
      data: { type: 'browser', path, content: data.content },
    };
  },
  async autocomplete(args) {
    if (args.length === 0) {
      const res = await fetch('/api/fs/list');
      const data = await res.json();
      if (!data.success) return [];
      return data.entries
        .filter((e: { name: string; isDir: boolean }) => e.name.endsWith('.html'))
        .map((e: { name: string }) => ({ value: e.name, description: 'HTML file', type: 'file' as const }));
    }
    return [];
  },
  validate(args) {
    if (args.length === 0) return 'Usage: /browser <filepath>';
    return null;
  },
};

registry.register(browserCommand);
