import type { Plugin, PluginInputPayload, PluginInputResult } from '../../core/plugin-system/types';
import type { PluginAction } from '../../core/actions/types';
import type { SearchResult } from './search';
import { getRuntime } from '../../core/runtime/instance';
import searchCommand, { performSearch } from './search';
import { SearchResultsView } from './SearchResultsView';
import { searchManifest } from './manifest';
import { searchDefaultSettings, searchSettingsSchema } from './settings';

function findResultById(results: SearchResult[], query: string): { row: number; result: SearchResult } | null {
  const parts = query.split(' ');
  if (parts.length < 2) return null;
  const rowNum = parseInt(parts[1]);
  if (isNaN(rowNum) || rowNum < 1 || rowNum > results.length) return null;
  return { row: rowNum, result: results[rowNum - 1] };
}

const openAction: PluginAction = {
  id: 'open',
  type: 'search',
  title: 'Open result',
  description: 'Open a search result by row number',
  handler: async (ctx) => {
    const results = ctx.tabState.results as SearchResult[] | undefined;
    if (!results) return 'No search results available';
    const found = findResultById(results, ctx.query);
    if (!found) return 'Usage: >open <row-number>';
    const runtime = getRuntime();
    const cmdResult = await runtime.execute({ name: 'open', args: [found.result.file], raw: '' });
    if (cmdResult.success && cmdResult.data) {
      const d = cmdResult.data as Record<string, unknown>;
      if (ctx.addTab) {
        ctx.addTab('editor', found.result.file, d);
      }
      runtime.feedback.show({ level: 'success', message: `Opened ${found.result.file}`, dismissible: true });
      return `Opened ${found.result.file}`;
    }
    runtime.feedback.show({ level: 'error', message: `Failed to open ${found.result.file}`, dismissible: true });
    return `Failed to open ${found.result.file}: ${cmdResult.message}`;
  },
};

const copyAction: PluginAction = {
  id: 'copy',
  type: 'search',
  title: 'Copy result path',
  description: 'Copy a search result file path by row number',
  handler: async (ctx) => {
    const results = ctx.tabState.results as SearchResult[] | undefined;
    if (!results) return 'No search results available';
    const found = findResultById(results, ctx.query);
    if (!found) return 'Usage: >copy <row-number>';
    const text = `${found.result.file}:${found.result.line}`;
    try {
      await navigator.clipboard.writeText(text);
      getRuntime().feedback.show({ level: 'success', message: `Copied ${text}`, dismissible: true });
      return `Copied ${text}`;
    } catch {
      getRuntime().feedback.show({ level: 'error', message: 'Failed to copy to clipboard', dismissible: true });
      return 'Failed to copy to clipboard';
    }
  },
};

export const searchPlugin: Plugin = {
  id: 'search',
  name: 'Search',
  version: '0.1.0',
  description: 'Search file contents for patterns',
  commands: [searchCommand],
  manifest: searchManifest,
  settings: searchDefaultSettings,
  settingsSchema: searchSettingsSchema,
  actions: [openAction, copyAction],
  views: [
    {
      type: 'search',
      component: SearchResultsView,
      meta: { label: 'Search', icon: '\uD83D\uDD0D' },
    },
  ],
  docs: {
    overview: 'Search file contents or filenames. Supports content search (literal text) and filename search (*.ext patterns). Results are displayed in a dedicated tab with row numbers for use with >open and >copy actions.',
    examples: '  /search useEffect\n  /search auth\n  /search *.md\n  /search *.ts src',
    workflows: '  1. /search <pattern> opens a search tab\n  2. Focus stays on search tab — type a new query to re-search\n  3. >open 2 to open the second result\n  4. >copy 1 to copy the first result path',
    troubleshooting: '  "No results" — pattern is case-sensitive literal substring for content search.\n  Use *.ext patterns for filename search (e.g. *.md, *.ts).\n  Content search only covers: .ts, .tsx, .js, .jsx, .json, .md, .css, .html.',
  },
  async onInput(payload: PluginInputPayload): Promise<PluginInputResult | void> {
    const query = payload.input.trim();
    if (!query) return;
    try {
      const results = await performSearch(query);
      return {
        message: `Found ${results.length} result(s) for "${query}"`,
        state: { results, query },
      };
    } catch (err) {
      return { message: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};
