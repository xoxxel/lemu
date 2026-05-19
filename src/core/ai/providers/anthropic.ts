import type { AIProvider, AIMessage, ChatOptions } from '../types';

export function createAnthropicProvider(config: {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
}): AIProvider {
  const endpoint = (config.endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '');

  const provider: AIProvider = {
    id: 'anthropic',
    name: 'Anthropic',

    supportsStreaming() { return false; },
    supportsTools() { return false; },

    async chat(messages, options) {
      const model = options?.model || config.model || 'claude-sonnet-4-20250514';
      const maxTokens = options?.maxTokens || config.maxTokens || 4096;

      const systemMessages = messages.filter((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: nonSystemMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      };

      if (systemMessages.length > 0) {
        body.system = systemMessages.map((m) => ({ type: 'text', text: m.content }));
      }

      if (options?.temperature !== undefined) body.temperature = options.temperature;

      const res = await fetch(`${endpoint}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic error (${res.status}): ${text}`);
      }

      const data = await res.json();
      const content = (data.content as Array<Record<string, unknown>>)
        ?.filter((b) => b.type === 'text')
        .map((b) => b.text as string)
        .join('') || '';

      return { role: 'assistant', content };
    },
  };

  return provider;
}
