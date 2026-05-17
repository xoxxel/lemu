import type { Command, AutocompleteItem } from '../../core/commands/types';

const aiCommand: Command = {
  name: 'ai',
  description: 'Ask AI about the workspace (requires API key)',
  aliases: ['ask'],
  usage: '/ai <question> or /ai config <key=value>',
  examples: [
    { input: '/ai config apiKey=sk-...', description: 'Configure AI provider with API key' },
    { input: '/ai What is this project?', description: 'Ask a question about the workspace' },
    { input: '/ai Explain the plugin system', description: 'Get explanation of code architecture' },
    { input: '/ask How does routing work?', description: 'Ask using alias' },
  ],
  edgeCases: [
    { scenario: 'not configured', input: '/ai hello', expected: 'error: No API key configured' },
    { scenario: 'empty key', input: '/ai config apiKey=', expected: 'Provide an API key' },
    { scenario: 'network error', input: '/ai question', expected: 'error: fetch failed' },
  ],
  async execute(args) {
    if (args.length === 0) return { success: false, message: 'Usage: /ai <question> or /ai config <key=value>' };

    if (args[0] === 'config') {
      const configArgs = args.slice(1).join(' ').split(',').map((s) => s.trim());
      const config: Record<string, string> = {};
      for (const ca of configArgs) {
        const eqIdx = ca.indexOf('=');
        if (eqIdx > 0) {
          config[ca.slice(0, eqIdx).trim()] = ca.slice(eqIdx + 1).trim();
        }
      }
      const { configureAI } = await import('../../core/ai');
      return configureAI(config);
    }

    const { askAI } = await import('../../core/ai');
    const question = args.join(' ');
    const result = await askAI(question);
    return result;
  },
  async autocomplete(args) {
    if (args.length === 0) {
      return [
        { value: 'config', description: 'Configure AI provider (apiKey=sk-...)', type: 'arg' },
        { value: 'analyze ', description: 'Analyze the project structure', type: 'arg' },
        { value: 'explain ', description: 'Explain code or concepts', type: 'arg' },
      ];
    }
    if (args[0] === 'config') {
      return [
        { value: 'apiKey=', description: 'Set API key', type: 'arg' },
        { value: 'endpoint=', description: 'Set API endpoint URL', type: 'arg' },
        { value: 'model=', description: 'Set model name', type: 'arg' },
      ];
    }
    return [];
  },
  validate() { return null; },
};

export default aiCommand;
