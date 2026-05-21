import type { Command, AutocompleteItem } from '../../core/commands/types';
import { getRuntime } from '../../core/runtime/instance';
import { PatchNormalizer } from '../../core/coder/patch-normalizer';

const api = {
  async readFile(path: string): Promise<string> {
    const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.content;
  },

  async listFiles(dir?: string): Promise<AutocompleteItem[]> {
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`/api/fs/list${params}`);
    const data = await res.json();
    if (!data.success) return [];
    return data.entries.map((e: { name: string; isDir: boolean }) => ({
      value: e.name,
      type: e.isDir ? 'dir' as const : 'file' as const,
    }));
  },

  async getWorkspaceTree(): Promise<string> {
    const res = await fetch('/api/fs/tree?depth=2');
    const data = await res.json();
    return data.success ? data.tree : '';
  },
};

function detectFilePath(args: string[]): { path: string | null; prompt: string } {
  if (args.length === 0) return { path: null, prompt: '' };

  const first = args[0];
  if (!first.includes('/') && !first.includes('\\') && !first.includes('.')) {
    return { path: null, prompt: args.join(' ') };
  }

  return { path: first, prompt: args.slice(1).join(' ') };
}

function resolveEngineSettings(): {
  engineId: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
} {
  const runtime = getRuntime();
  const appCtx = runtime.getContext();
  return {
    engineId: (appCtx.get('coder:engine') as string) || 'default',
    providerId: appCtx.get('coder:provider') as string || undefined,
    model: appCtx.get('coder:model') as string || undefined,
    temperature: appCtx.get('coder:temperature') as number,
    maxTokens: appCtx.get('coder:maxTokens') as number,
  };
}

const coderCommand: Command = {
  name: 'coder',
  description: 'AI-powered code editing — generate and propose changes via the edit pipeline',
  aliases: ['c', 'edit-ai', 'code'],
  usage: '/coder <filepath> <description of change>',
  examples: [
    { input: '/coder src/App.tsx Add error boundaries around the router', description: 'Edit a specific file via AI' },
    { input: '/c src/utils.ts Refactor the validation logic', description: 'Alias shorthand' },
    { input: '/coder Explain the architecture', description: 'Ask a question (no file edit)' },
  ],
  edgeCases: [
    { scenario: 'no file match', input: '/coder Add tests', expected: 'treated as question, not a file edit' },
    { scenario: 'engine returns no patches', input: '/coder src/a.ts refactor', expected: 'error: engine produced no changes' },
  ],

  async execute(args) {
    const { path, prompt } = detectFilePath(args);
    if (!prompt) {
      return { success: false, message: 'Usage: /coder <filepath> <description of change>' };
    }

    const runtime = getRuntime();

    let owned = false;

    try {
      let fileContent = '';
      let filePath = path;

      if (filePath) {
        try {
          fileContent = await api.readFile(filePath);
        } catch {
          return { success: false, message: `Could not read file: ${filePath}` };
        }
      }

      if (!filePath) {
        return {
          success: true,
          message: 'Use /coder <filepath> <instructions> to edit a file.',
          data: { type: 'ai', content: '' },
        };
      }

      if (runtime.ownership.hasOwner() && !runtime.ownership.isOwnedBy('coder')) {
        const owner = runtime.ownership.getOwner();
        return { success: false, message: `Cannot run coder: '${owner?.pluginId}' holds ownership. Exit their mode first.` };
      }

      runtime.ownership.acquire('coder', 'coder-command', '', null);
      owned = true;

      const engineSettings = resolveEngineSettings();
      const engine = runtime.coderEngines.get(engineSettings.engineId) || runtime.coderEngines.getDefault();
      if (!engine) {
        runtime.ownership.release('coder'); owned = false;
        return { success: false, message: `No coding engine available. Configure via /coder settings.` };
      }

      const available = await engine.isAvailable();
      if (!available) {
        runtime.ownership.release('coder'); owned = false;
        return { success: false, message: `Engine '${engine.id}' is not available. Check configuration.` };
      }

      let workspaceContext = '';
      try {
        workspaceContext = await api.getWorkspaceTree();
      } catch {}

      const result = await engine.generatePatches({
        filePath,
        instructions: prompt,
        currentContent: fileContent,
        workspaceContext,
        providerId: engineSettings.providerId,
        model: engineSettings.model,
        temperature: engineSettings.temperature,
        maxTokens: engineSettings.maxTokens,
      });

      runtime.ownership.release('coder'); owned = false;

      if (result.outputFormat === 'patches') {
        if (!result.patches || result.patches.length === 0) {
          return { success: false, message: 'Engine produced no patches. Try a more specific request.' };
        }
      } else if (result.outputFormat === 'fullFile') {
        if (!result.output) {
          return { success: false, message: 'Engine returned no output. Try a more specific request.' };
        }
        result.patches = PatchNormalizer.fromFullFile(fileContent, result.output);
        if (result.patches.length === 0) {
          return { success: false, message: 'Engine returned no changes. Try a more specific request.' };
        }
      } else {
        return { success: false, message: `Engine returned unsupported output format: '${result.outputFormat}'` };
      }

      if (!result.patches || result.patches.length === 0) {
        return { success: false, message: 'Engine produced no changes. Try a more specific request.' };
      }

      const proposedContent = applyPatchesToString(fileContent, result.patches);

      if (proposedContent === fileContent) {
        return { success: false, message: 'Engine returned no changes. Try a more specific request.' };
      }

      const pipeline = runtime.getEditPipeline();
      const suggestion = await pipeline.propose({
        filePath,
        originalContent: fileContent,
        proposedContent,
        source: 'ai-coder',
      });

      return {
        success: true,
        message: `AI proposed changes for ${filePath} (engine: ${result.engine})\n${suggestion.diff}`,
        data: {
          type: 'edit-workflow',
          path: filePath,
          originalContent: fileContent,
          currentContent: proposedContent,
          editHistory: [],
          pendingSuggestionId: suggestion.id,
          aiContext: {
            prompt,
            engine: result.engine,
            suggestionId: suggestion.id,
            patches: result.patches,
          },
        },
      };
    } catch (err) {
      return {
        success: false,
        message: `Coder error: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      if (owned) {
        try { runtime.ownership.release('coder'); } catch {}
      }
    }
  },

  async autocomplete(args) {
    if (args.length === 0) return api.listFiles();
    const first = args[0];
    if (!first.includes('/') && !first.includes('\\') && !first.includes('.')) {
      return [];
    }
    const dir = first.includes('/') ? first.split('/').slice(0, -1).join('/') || '.' : '.';
    const prefix = first.split('/').pop() || '';
    const items = await api.listFiles(dir);
    return items.filter((i) => i.value.startsWith(prefix));
  },

  validate(args) {
    if (args.length === 0) return 'Usage: /coder <filepath> <description of change>';
    return null;
  },
};

function applyPatchesToString(document: string, patches: Array<{ range: { start: number; end: number }; oldText: string; newText: string }>): string {
  const sorted = [...patches].sort((a, b) => a.range.start - b.range.start);
  let result = '';
  let lastEnd = 0;
  for (const p of sorted) {
    if (p.range.start < lastEnd) {
      throw new Error(`Overlapping patches: ${JSON.stringify(p.range)} overlaps previous end ${lastEnd}`);
    }
    result += document.slice(lastEnd, p.range.start);
    result += p.newText;
    lastEnd = p.range.end;
  }
  result += document.slice(lastEnd);
  return result;
}

export { coderCommand };
