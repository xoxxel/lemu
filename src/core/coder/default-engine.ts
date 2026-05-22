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
      'You are a coding assistant inside Lemu, a keyboard-first editor.',
      '',
      'Rules:',
      '- If the user is asking a question or requesting explanation (not a code change): respond with plain text only. Do not generate a diff or patch.',
      '- If the user is requesting a code change: briefly say what you\'re changing (1 line), then return the unified diff.',
      '- If ambiguous: ask exactly ONE question, no diff yet.',
      '- If you see a potential problem with the approach: mention it briefly.',
      '- Never return full file content, only diffs.',
      '- Be concise.',
      '',
      `File: ${task.filePath}`,
      '',
      'Current content:',
      '```',
      task.currentContent || '(empty file)',
      '```',
      '',
      `Request: ${task.instructions}`,
    ].join('\n');

    const messages: AIMessage[] = [
      { role: 'system', content: systemMsg },
    ];

    const response = await provider.chat(messages, {
      temperature: task.temperature ?? 0.3,
      model: task.model,
      maxTokens: task.maxTokens,
    });

    const responseText = response.content.trim();

    /* detect whether response contains a diff or is conversational */
    const diffText = this.extractUnifiedDiff(responseText);

    if (!diffText) {
      /* no diff found — conversational response */
      if (responseText) {
        return {
          outputFormat: 'explanation',
          explanation: responseText,
          engine: this.id,
          metadata: {
            providerId: provider.id,
            model: provider.model,
          },
        };
      }
      throw new Error('AI returned an empty response. Try again.');
    }

    const patches = PatchNormalizer.fromUnifiedDiff(diffText, task.currentContent);
    if (patches.length === 0) {
      throw new Error('AI returned no changes. Try a more specific request.');
    }

    return {
      outputFormat: 'unified',
      patches,
      output: diffText,
      explanation: responseText,
      engine: this.id,
      metadata: {
        providerId: provider.id,
        model: provider.model,
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

  private extractUnifiedDiff(text: string): string | null {
    const codeBlock = text.match(/```(?:diff)?\n([\s\S]*?)```/);
    if (codeBlock) return codeBlock[1].trim();
    const diffMatch = text.match(/@@[^@]*@@[\s\S]*/);
    return diffMatch ? diffMatch[0].trim() : null;
  }
}
