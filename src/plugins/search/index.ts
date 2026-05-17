import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import searchCommand from './search';

export const searchPlugin: Plugin = {
  id: 'search',
  name: 'Code Search',
  version: '0.1.0',
  description: 'Search file contents for patterns',
  commands: [searchCommand],
  actions: standardActions,
  tabTypes: ['search'],
  docs: {
    overview: 'Search file contents for literal text patterns across the workspace. The server walks the directory tree and matches lines using substring inclusion.',
    examples: '  /search function\n  /search TODO src/components\n  /grep import',
    workflows: '  1. Find all usages: /search componentName\n  2. Scope to directory: /search pattern src/\n  3. Open result: /open src/file.ts (from search output)',
    troubleshooting: '  "No results" — the pattern is case-sensitive and must be a literal substring.\n  Search only covers: .ts, .tsx, .js, .jsx, .json, .md, .css, .html files.\n  node_modules and hidden directories are excluded automatically.',
    tips: '  Combine with /open: first /search to find references, then /open the file.\n  Search results are scoped; add a directory as the second argument.',
    limitations: '  Pattern matching is case-sensitive substring (String.includes), not regex.\n  No indexing — each search walks the filesystem.\n  Only searches specific file extensions.',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
