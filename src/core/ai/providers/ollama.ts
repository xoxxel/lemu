import type { AIProvider, AIMessage, ChatOptions } from '../types';

export function createOllamaProvider(config: {
  endpoint?: string;
  model?: string;
}): AIProvider {
  const endpoint = (config.endpoint || 'http://localhost:11434').replace(/\/+$/, '');

  const provider: AIProvider = {
    id: 'ollama',
    name: 'Ollama',

    supportsStreaming() { return false; },
    supportsTools() { return false; },

    async chat(messages, options) {
      const model = options?.model || config.model || 'llama3';

      const body: Record<string, unknown> = {
        model,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
          content: m.content,
        })),
        stream: false,
      };

      if (options?.temperature !== undefined) body.temperature = options.temperature;

      const res = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Ollama error (${res.status}): ${text}`);
      }

      const data = await res.json();
      return {
        role: 'assistant',
        content: (data.message as Record<string, unknown>)?.content as string || '',
      };
    },
  };

  return provider;
}
