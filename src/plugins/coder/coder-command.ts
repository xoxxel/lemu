import type { Command, AutocompleteItem } from '../../core/commands/types';
import { getRuntime } from '../../core/runtime/instance';

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

function extractCodeBlock(text: string): string | null {
  const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
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
    { scenario: 'AI returns no code block', input: '/coder src/a.ts refactor', expected: 'error: AI did not return code' },
  ],

  async execute(args) {
    const { path, prompt } = detectFilePath(args);
    if (!prompt) {
      return { success: false, message: 'Usage: /coder <filepath> <description of change>' };
    }

    const runtime = getRuntime();
    const registry = runtime.getAIProviderRegistry();
    const provider = registry.getDefaultProvider();
    if (!provider) {
      return { success: false, message: 'No AI provider configured. Set VITE_LEMU_AI_API_KEY or configure via /ai config.' };
    }

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

      let workspaceContext = '';
      try {
        workspaceContext = await api.getWorkspaceTree();
      } catch {}

      const systemMsg = fileContent
        ? [
          `You are a code editor assistant. The user wants to modify a file.`,
          ``,
          `File: ${filePath}`,
          ``,
          `Current content:`,
          `\`\`\``,
          fileContent,
          `\`\`\``,
          ``,
          `Request: ${prompt}`,
          ``,
          `Return ONLY the complete modified file inside a single markdown code block.`,
          `Do not include explanations, do not truncate — return the FULL file content.`,
        ].join('\n')
        : [
          `You are a code assistant. Answer the user's question about their workspace.`,
          ``,
          workspaceContext ? `Workspace tree:\n${workspaceContext}\n` : '',
          `Question: ${prompt}`,
        ].join('\n');

      const response = await provider.chat(
        [{ role: 'system', content: systemMsg }],
        { temperature: 0.3 },
      );

      if (!filePath) {
        return {
          success: true,
          message: response.content || '(no response)',
          data: { type: 'ai', content: response.content },
        };
      }

      const proposedContent = extractCodeBlock(response.content) || response.content.trim();

      if (!proposedContent || proposedContent === fileContent.trim()) {
        return { success: false, message: 'AI returned no changes. Try a more specific request.' };
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
        message: `AI proposed changes for ${filePath}\n${suggestion.diff}`,
        data: {
          type: 'edit-workflow',
          path: filePath,
          originalContent: fileContent,
          currentContent: proposedContent,
          editHistory: [],
          pendingSuggestionId: suggestion.id,
          aiContext: { prompt, model: provider.id, suggestionId: suggestion.id },
        },
      };
    } catch (err) {
      return {
        success: false,
        message: `Coder error: ${err instanceof Error ? err.message : String(err)}`,
      };
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

export { coderCommand };
