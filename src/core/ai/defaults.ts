import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { createOpenAIProvider } from './providers/openai';
import { createOllamaProvider } from './providers/ollama';
import { createAnthropicProvider } from './providers/anthropic';
import type { ProviderDefinition } from './types';

export function registerDefaultProviders(defs?: ProviderDefinition[]): void {
  const envKey = (typeof window !== 'undefined'
    ? (window as unknown as Record<string, string>).__LEMU_AI_KEY__
    : undefined) as string
    || import.meta.env.VITE_LEMU_AI_API_KEY as string
    || '';

  const envEndpoint = import.meta.env.VITE_LEMU_AI_ENDPOINT as string || undefined;
  const envModel = import.meta.env.VITE_LEMU_AI_MODEL as string || undefined;

  if (defs && defs.length > 0) {
    for (const def of defs) {
      switch (def.id) {
        case 'openai':
          providerRegistry.register(def.id, createOpenAIProvider({
            apiKey: def.apiKey || envKey,
            endpoint: def.endpoint || envEndpoint,
            model: def.defaultModel || envModel,
          }), def);
          break;
        case 'anthropic':
          providerRegistry.register(def.id, createAnthropicProvider({
            apiKey: def.apiKey,
            endpoint: def.endpoint,
            model: def.defaultModel,
          }), def);
          break;
        case 'ollama':
          providerRegistry.register(def.id, createOllamaProvider({
            endpoint: def.endpoint,
            model: def.defaultModel,
          }), def);
          break;
        default:
          break;
      }
    }
    return;
  }

  const openaiDef: ProviderDefinition = {
    id: 'openai',
    name: 'OpenAI',
    endpoint: envEndpoint || 'https://api.openai.com/v1',
    defaultModel: envModel || 'gpt-4o',
  };

  providerRegistry.register('openai', createOpenAIProvider({
    apiKey: envKey,
    endpoint: openaiDef.endpoint,
    model: openaiDef.defaultModel,
  }), openaiDef);

  providerRegistry.register('ollama', createOllamaProvider({
    endpoint: 'http://localhost:11434',
  }), { id: 'ollama', name: 'Ollama', endpoint: 'http://localhost:11434', defaultModel: 'llama3' });

  providerRegistry.register('anthropic', createAnthropicProvider({
    endpoint: 'https://api.anthropic.com/v1',
  }), { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514' });
}
