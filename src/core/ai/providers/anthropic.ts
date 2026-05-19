import type { AIProvider, AIMessage, ChatOptions, ProviderHealth } from '../types';

export function createAnthropicProvider(config: {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
}): AIProvider {
  const endpoint = (config.endpoint || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
  const model = config.model || 'claude-sonnet-4-20250514';

  const provider: AIProvider = {
    id: 'anthropic',
    name: 'Anthropic',
    get model() { return model; },
    get endpoint() { return endpoint; },

    supportsStreaming() { return false; },
    supportsTools() { return false; },

    async checkHealth(): Promise<ProviderHealth> {
      const start = Date.now();
      try {
        const res = await fetch(`${endpoint}/models`, {
          headers: {
            'x-api-key': config.apiKey || '',
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          const reason = res.status === 401 ? 'invalid-api-key' : `HTTP ${res.status}`;
          return { ok: false, latency: Date.now() - start, error: reason };
        }
        const data = await res.json();
        const models: string[] = (data.data as Array<{ id: string }> || []).map((m: { id: string }) => m.id);
        return { ok: true, latency: Date.now() - start, modelCount: models.length, models };
      } catch (err) {
        return { ok: false, latency: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async chat(messages, options) {
      const resolvedModel = options?.model || model;
      const maxTokens = options?.maxTokens || config.maxTokens || 4096;

      const systemMessages = messages.filter((m) => m.role === 'system');
      const nonSystemMessages = messages.filter((m) => m.role !== 'system');

      const body: Record<string, unknown> = {
        model: resolvedModel,
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
