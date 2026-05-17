import type { Command, AutocompleteItem } from '../../core/commands/types';

const browserCommand: Command = {
  name: 'browser',
  description: 'Preview an HTML file in the embedded browser',
  aliases: ['browse', 'preview', 'open'],
  usage: '/browser <filepath>',
  examples: [
    { input: '/browser index.html', description: 'Preview an HTML file' },
    { input: '/browse dist/index.html', description: 'Preview using alias' },
  ],
  edgeCases: [
    { scenario: 'file not found', input: '/browser nope.html', expected: 'Cannot preview nope.html' },
    { scenario: 'not an HTML file', input: '/browser script.js', expected: 'reads but renders as text' },
    { scenario: 'path traversal', input: '/browser ../../etc/passwd', expected: 'error: Path outside workspace' },
  ],
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

export default browserCommand;
