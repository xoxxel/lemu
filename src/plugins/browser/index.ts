import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import { standardActions } from '../../core/actions';
import browserCommand from './browser';

export const browserPlugin: Plugin = {
  id: 'browser',
  name: 'Browser Preview',
  version: '0.1.0',
  description: 'Preview HTML files in an embedded browser',
  commands: [browserCommand],
  actions: standardActions,
  tabTypes: ['browser'],
  docs: {
    overview: 'Preview HTML files in an embedded iframe within the workspace. The file content is read via the server API and rendered with sandboxed scripts.',
    examples: '  /browser index.html\n  /browse dist/index.html\n  /preview build/report.html',
    workflows: '  1. Create HTML: echo "<h1>Hello</h1>" > test.html\n  2. Preview: /browser test.html\n  3. Update: edit the HTML file\n  4. Re-preview: /browser test.html (new message)',
    troubleshooting: '  "Cannot preview" — the file may not exist or is outside the workspace.\n  JavaScript executes but is sandboxed (no same-origin access, no forms).\n  Iframe height is fixed at 400px.',
    tips:  '  Use /browser to check HTML output without leaving the workspace.\n  Combine with shell commands to create and preview HTML templates.',
    limitations: '  No live reload — re-run /browser to see changes.\n  iframe is sandboxed (allow-scripts only).\n  Fixed height (400px).\n  Only static files (no dev server proxy).',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
