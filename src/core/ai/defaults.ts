import { providerRegistry } from './provider-registry';
import { modelRegistry } from './model-registry';
import { createOpenAIProvider } from './providers/openai';
import { createOllamaProvider } from './providers/ollama';
import { createAnthropicProvider } from './providers/anthropic';
import type { ProviderConfig, ProviderDefinition } from './types';
import { defaultAISettings, resolveProviderConfig, resolveDefaultProviderId } from './settings';

const ALL_KNOWN_PROVIDERS = ['openai', 'anthropic', 'ollama'];

function getResolvedConfig(id: string, overrides?: ProviderConfig): ProviderConfig {
  const fromRegistry = resolveProviderConfig(id);
  const fromDefaults = defaultAISettings.providers[id] || {};
  const fromOverrides = overrides || {};
  return {
    endpoint: fromRegistry.endpoint || fromOverrides.endpoint || fromDefaults.endpoint,
    model: fromRegistry.model || fromOverrides.model || fromDefaults.model,
    apiKey: fromRegistry.apiKey || fromOverrides.apiKey || fromDefaults.apiKey,
  };
}

export function registerDefaultProviders(defs?: ProviderDefinition[]): void {
  const envKey = (typeof window !== 'undefined'
    ? (window as unknown as Record<string, string>).__LEMU_AI_KEY__
    : undefined) as string
    || import.meta.env.VITE_LEMU_AI_API_KEY as string
    || '';

  const envEndpoint = import.meta.env.VITE_LEMU_AI_ENDPOINT as string | undefined;
  const envModel = import.meta.env.VITE_LEMU_AI_MODEL as string | undefined;

  if (defs && defs.length > 0) {
    for (const def of defs) {
      const config = getResolvedConfig(def.id, {
        apiKey: def.apiKey || envKey,
        endpoint: def.endpoint || envEndpoint,
        model: def.defaultModel || envModel,
      });
      registerSingleProvider(def.id, config, def);
    }
    applyDefaultProvider();
    return;
  }

  for (const id of ALL_KNOWN_PROVIDERS) {
    const config = getResolvedConfig(id, {
      apiKey: id === 'openai' ? envKey : undefined,
      endpoint: id === 'openai' ? envEndpoint : undefined,
      model: id === 'openai' ? envModel : undefined,
    });
    const def: ProviderDefinition = {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      endpoint: config.endpoint,
      defaultModel: config.model,
      apiKey: config.apiKey,
    };
    registerSingleProvider(id, config, def);
  }

  applyDefaultProvider();
}

function applyDefaultProvider(): void {
  const defId = resolveDefaultProviderId();
  if (defId && providerRegistry.has(defId)) {
    providerRegistry.setDefaultProvider(defId);
  } else if (providerRegistry.ids.length > 0) {
    const first = providerRegistry.ids[0];
    providerRegistry.setDefaultProvider(first);
    console.log(`[AI] Default provider not found, falling back to first registered: ${first}`);
  }
}

function registerSingleProvider(id: string, config: ProviderConfig, def: ProviderDefinition): void {
  const resolvedEndpoint = config.endpoint || def.endpoint || '';
  const resolvedModel = config.model || def.defaultModel || '';

  switch (id) {
    case 'openai':
      providerRegistry.register(id, createOpenAIProvider({
        apiKey: config.apiKey,
        endpoint: resolvedEndpoint,
        model: resolvedModel,
      }), { ...def, endpoint: resolvedEndpoint, defaultModel: resolvedModel, apiKey: config.apiKey });
      break;
    case 'anthropic':
      providerRegistry.register(id, createAnthropicProvider({
        apiKey: config.apiKey,
        endpoint: resolvedEndpoint,
        model: resolvedModel,
      }), { ...def, endpoint: resolvedEndpoint, defaultModel: resolvedModel, apiKey: config.apiKey });
      break;
    case 'ollama':
      providerRegistry.register(id, createOllamaProvider({
        endpoint: resolvedEndpoint,
        model: resolvedModel,
      }), { ...def, endpoint: resolvedEndpoint, defaultModel: resolvedModel });
      break;
    default:
      break;
  }
}

export function reconfigureProvider(id: string): void {
  const config = getResolvedConfig(id);
  const def: ProviderDefinition = { id, name: id.charAt(0).toUpperCase() + id.slice(1), ...config };
  registerSingleProvider(id, config, def);
}

export function reconfigureAllProviders(): void {
  for (const id of providerRegistry.ids) {
    reconfigureProvider(id);
  }
}
