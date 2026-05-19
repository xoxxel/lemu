import type { AIProvider, AIMessage, ChatOptions, ProviderHealth } from '../types';

export function createOllamaProvider(config: {
  endpoint?: string;
  model?: string;
}): AIProvider {
  const endpoint = (config.endpoint || 'http://localhost:11434').replace(/\/+$/, '');
  const model = config.model || 'qwen2.5-coder:7b';

  const provider: AIProvider = {
    id: 'ollama',
    name: 'Ollama',
    get model() { return model; },
    get endpoint() { return endpoint; },

    supportsStreaming() { return false; },
    supportsTools() { return false; },

    async checkHealth(): Promise<ProviderHealth> {
      const start = Date.now();
      try {
        const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
          return { ok: false, latency: Date.now() - start, error: `HTTP ${res.status}: ${res.statusText}` };
        }
        const data = await res.json();
        const models: string[] = (data.models as Array<{ name: string }> || []).map((m: { name: string }) => m.name);
        const hasModel = models.some(m => m.startsWith(model));
        return {
          ok: true,
          latency: Date.now() - start,
          modelCount: models.length,
          models,
          error: hasModel ? undefined : `model '${model}' not found among ${models.length} installed models`,
        };
      } catch (err) {
        return { ok: false, latency: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async chat(messages, options) {
      const resolvedModel = options?.model || model;

      const body: Record<string, unknown> = {
        model: resolvedModel,
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
