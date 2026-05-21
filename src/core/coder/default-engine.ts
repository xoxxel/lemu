import type { CoderEngine, CodingTask, CodingResult } from './types';
import type { ProviderRegistry, AIMessage } from '../ai';
import { PatchNormalizer } from './patch-normalizer';

export class DefaultCoderEngine implements CoderEngine {
  readonly id = 'default';
  readonly name = 'Default (AI Provider)';

  constructor(private providerRegistry: ProviderRegistry) {}

  async generatePatches(task: CodingTask): Promise<CodingResult> {
    const providerId = task.providerId || this.providerRegistry.getDefaultProviderId() || undefined;
    const provider = providerId ? this.providerRegistry.get(providerId) : this.providerRegistry.getDefaultProvider();
    if (!provider) {
      throw new Error('No AI provider configured. Set VITE_LEMU_AI_API_KEY or configure via /ai config.');
    }

    const systemMsg = [
      'You are a code editor assistant. The user wants to modify a file.',
      '',
      `File: ${task.filePath}`,
      '',
      'Current content:',
      '```',
      task.currentContent || '(empty file)',
      '```',
      '',
      `Request: ${task.instructions}`,
      '',
      'Return ONLY the complete modified file inside a single markdown code block.',
      'Do not include explanations, do not truncate — return the FULL file content.',
    ].join('\n');

    const messages: AIMessage[] = [
      { role: 'system', content: systemMsg },
    ];

    const response = await provider.chat(messages, {
      temperature: task.temperature ?? 0.3,
      model: task.model,
      maxTokens: task.maxTokens,
    });

    const proposedContent = this.extractCodeBlock(response.content) || response.content.trim();
    if (!proposedContent || proposedContent === task.currentContent.trim()) {
      throw new Error('AI returned no changes. Try a more specific request.');
    }

    const patches = PatchNormalizer.fromFullFile(task.currentContent, proposedContent);

    return {
      patches,
      explanation: response.content,
      engine: this.id,
      metadata: {
        providerId: provider.id,
        model: provider.model,
        proposedContent,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    const provider = this.providerRegistry.getDefaultProvider();
    if (!provider) return false;
    try {
      const health = await provider.checkHealth();
      return health.ok;
    } catch {
      return false;
    }
  }

  private extractCodeBlock(text: string): string | null {
    const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }
}
