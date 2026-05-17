import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import aiCommand from './ai-cmd';
import agentCommand from './agent-cmd';

export const aiPlugin: Plugin = {
  id: 'ai',
  name: 'AI Integration',
  version: '0.1.0',
  description: 'AI and agent commands',
  commands: [aiCommand, agentCommand],
  tabTypes: ['ai', 'agent'],
  docs: {
    overview: 'AI-powered assistance including Q&A (/ai) and autonomous agent (/agent). Requires an API key from an OpenAI-compatible provider.',
    examples: '  /ai config apiKey=sk-...\n  /ai How does the parser work?\n  /agent fix the build errors\n  /ask What is this project?\n  /auto analyze the architecture',
    workflows: '  1. Configure: /ai config apiKey=sk-...\n  2. Ask questions: /ai What does this code do?\n  3. Run agent: /agent analyze the project\n  4. Refactor: /agent refactor the parser to use TypeScript',
    troubleshooting: '  "No API key configured" — set key with /ai config apiKey=sk-...\n  Supports any OpenAI-compatible endpoint (change via /ai config endpoint=...)\n  The AI module is lazy-loaded on first use (cold start on first command).',
    tips:  '  Configure early in your session so AI is ready when needed.\n  The agent can modify files — it runs shell commands autonomously.\n  Use /ai for quick questions; /agent for multi-step tasks.\n  The agent has up to 25 tool-calling iterations.',
    limitations: '  Requires an external API key (no built-in LLM).\n  AI module is code-split — first command is slow (dynamic import).\n  Agent is autonomous with no human-in-the-loop approval.\n  Max 25 iterations per agent run.',
  },
  async activate(ctx: PluginContext) {
    for (const cmd of this.commands!) {
      ctx.commands.register(cmd);
    }
  },
};
