import type { ProviderDefinition } from './types';
import { providerRegistry } from './provider-registry';

export interface AISettings {
  defaultProvider: string;
  defaultModel: string;
  providers: ProviderDefinition[];
}

export const defaultAISettings: AISettings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  providers: [
    { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
    { id: 'ollama', name: 'Ollama', endpoint: 'http://localhost:11434', defaultModel: 'llama3' },
    { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', defaultModel: 'claude-sonnet-4-20250514' },
  ],
};

export function applyAISettings(settings: AISettings): void {
  if (settings.defaultProvider && providerRegistry.has(settings.defaultProvider)) {
    providerRegistry.setDefaultProvider(settings.defaultProvider);
  }

  if (settings.providers) {
    for (const def of settings.providers) {
      const existing = providerRegistry.getDefinition(def.id);
      if (existing) {
        Object.assign(existing, def);
      }
    }
  }
}

export function getAISettings(): AISettings {
  const defId = providerRegistry.getDefaultProviderId();
  const def = defId ? providerRegistry.getDefinition(defId) : undefined;

  return {
    defaultProvider: defId || 'openai',
    defaultModel: def?.defaultModel || 'gpt-4o',
    providers: Array.from(providerRegistry.ids)
      .map((id) => providerRegistry.getDefinition(id))
      .filter(Boolean) as ProviderDefinition[],
  };
}
