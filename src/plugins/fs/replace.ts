import type { Command, CommandResult, AutocompleteItem } from '../../core/commands/types';
import type { Operation } from '../../core/operations/types';

export const replaceCommand: Command = {
  name: 'replace',
  description: 'Replace all occurrences of a string within the active document',
  aliases: ['sub', 'substitute'],
  usage: '/replace <old> => <new>',
  examples: [
    { input: '/replace foo => bar', description: 'Replace all foo with bar' },
    { input: '/replace hello => world', description: 'Replace all hello with world' },
  ],
  validate(args) {
    const full = args.join(' ');
    if (!full.includes('=>')) return 'Usage: /replace <old> => <new>';
    return null;
  },
  async autocomplete(_args: string[]): Promise<AutocompleteItem[]> {
    return [];
  },
  async execute(args) {
    const full = args.join(' ');
    const sepIndex = full.indexOf('=>');
    if (sepIndex === -1) {
      return { success: false, message: 'Usage: /replace <old> => <new>' };
    }
    const oldText = full.slice(0, sepIndex).trim();
    const newText = full.slice(sepIndex + 2).trim();

    if (!oldText) {
      return { success: false, message: 'Replace: old text is required' };
    }

    const { getRuntime } = await import('../../core/runtime/instance');
    const runtime = getRuntime();

    if (!runtime.editorContext.document) {
      return { success: false, message: 'No active editor tab with content to replace' };
    }

    const operation: Operation = {
      type: 'replace',
      scope: { type: 'document' },
      args: { oldText, newText },
    };

    const result = await runtime.operations.run(operation, runtime.editorContext);

    if (!result.success) {
      return { success: false, message: result.error ?? 'Replace failed' };
    }

    const newDocument = result.metadata?.newDocument as string | undefined;
    const patchCount = result.transaction?.patches.length ?? 0;

    return {
      success: true,
      message: `Replaced ${patchCount} occurrence(s): ${oldText} => ${newText}`,
      data: {
        type: 'editor',
        content: newDocument,
        _operation: result,
        _patches: result.transaction?.patches,
      },
    };
  },
};
