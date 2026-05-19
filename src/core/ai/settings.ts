import type { ProviderConfig } from './types';
import { providerRegistry } from './provider-registry';
import { settingsRegistry } from '../settings/registry';
import { reconfigureAllProviders, reconfigureProvider } from './defaults';

export interface AIRuntimeSettings {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  maxTokens?: number;
  maxAgentIterations?: number;
}

export const defaultAISettings: AIRuntimeSettings = {
  defaultProvider: 'ollama',
  providers: {
    openai: { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
    anthropic: { endpoint: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
    ollama: { endpoint: 'http://localhost:11434', model: 'qwen2.5-coder:7b' },
  },
};

export function resolveProviderConfig(id: string): ProviderConfig {
  return {
    apiKey: settingsRegistry.get(`providers.${id}.apiKey`) as string | undefined,
    endpoint: settingsRegistry.get(`providers.${id}.endpoint`) as string | undefined,
    model: settingsRegistry.get(`providers.${id}.model`) as string | undefined,
  };
}

export function resolveDefaultProviderId(): string {
  return (settingsRegistry.get('ai.defaultProvider') as string) || defaultAISettings.defaultProvider;
}

export function applyAISettingsFromRegistry(): void {
  const defId = resolveDefaultProviderId();

  if (defId && providerRegistry.has(defId)) {
    providerRegistry.setDefaultProvider(defId);
  }

  reconfigureAllProviders();
}

export function applyProviderSettings(id: string): void {
  if (!providerRegistry.has(id)) return;
  const config = resolveProviderConfig(id);
  if (config.endpoint || config.model || config.apiKey) {
    reconfigureProvider(id);
  }
}

export function getAISettings(): AIRuntimeSettings {
  const configs: Record<string, ProviderConfig> = {};
  for (const id of providerRegistry.ids) {
    const def = providerRegistry.getDefinition(id);
    if (def) {
      configs[id] = {
        apiKey: def.apiKey,
        endpoint: def.endpoint,
        model: def.defaultModel,
      };
    }
  }

  return {
    defaultProvider: providerRegistry.getDefaultProviderId() || defaultAISettings.defaultProvider,
    providers: configs,
    maxTokens: settingsRegistry.get('ai.maxTokens') as number | undefined,
    maxAgentIterations: settingsRegistry.get('ai.maxAgentIterations') as number | undefined,
  };
}
