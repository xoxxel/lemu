import type { ModelInfo } from './types';

export class ModelRegistry {
  private models = new Map<string, ModelInfo>();
  private byProvider = new Map<string, string[]>();

  register(model: ModelInfo): void {
    this.models.set(model.id, model);
    const existing = this.byProvider.get(model.provider) || [];
    if (!existing.includes(model.id)) {
      existing.push(model.id);
      this.byProvider.set(model.provider, existing);
    }
  }

  get(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }

  getByProvider(providerId: string): ModelInfo[] {
    const ids = this.byProvider.get(providerId) || [];
    return ids.map((id) => this.models.get(id)).filter(Boolean) as ModelInfo[];
  }

  getAll(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  has(id: string): boolean {
    return this.models.has(id);
  }

  remove(id: string): boolean {
    const model = this.models.get(id);
    if (!model) return false;
    this.models.delete(id);
    const byProvider = this.byProvider.get(model.provider);
    if (byProvider) {
      const idx = byProvider.indexOf(id);
      if (idx >= 0) byProvider.splice(idx, 1);
    }
    return true;
  }

  clear(): void {
    this.models.clear();
    this.byProvider.clear();
  }
}

export const modelRegistry = new ModelRegistry();

function registerBuiltinModels(): void {
  const models: ModelInfo[] = [
    { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', maxTokens: 16384, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', maxTokens: 16384, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4.1', provider: 'openai', name: 'GPT-4.1', maxTokens: 32768, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4.1-mini', provider: 'openai', name: 'GPT-4.1 Mini', maxTokens: 32768, supportsTools: true, supportsStreaming: true },
    { id: 'gpt-4.1-nano', provider: 'openai', name: 'GPT-4.1 Nano', maxTokens: 32768, supportsTools: true, supportsStreaming: true },
    { id: 'o3', provider: 'openai', name: 'o3', maxTokens: 100000, supportsTools: true, supportsStreaming: true },
    { id: 'o4-mini', provider: 'openai', name: 'o4-mini', maxTokens: 100000, supportsTools: true, supportsStreaming: true },
    { id: 'claude-sonnet-4-20250514', provider: 'anthropic', name: 'Claude Sonnet 4', maxTokens: 8192, supportsTools: true, supportsStreaming: true },
    { id: 'claude-haiku-3-5-20241022', provider: 'anthropic', name: 'Claude Haiku 3.5', maxTokens: 8192, supportsTools: true, supportsStreaming: true },
    { id: 'claude-opus-4-20250514', provider: 'anthropic', name: 'Claude Opus 4', maxTokens: 8192, supportsTools: true, supportsStreaming: true },
    { id: 'llama3', provider: 'ollama', name: 'Llama 3', maxTokens: 4096, supportsTools: false, supportsStreaming: false },
    { id: 'llama3.1', provider: 'ollama', name: 'Llama 3.1', maxTokens: 8192, supportsTools: false, supportsStreaming: false },
    { id: 'mistral', provider: 'ollama', name: 'Mistral', maxTokens: 8192, supportsTools: false, supportsStreaming: false },
    { id: 'codellama', provider: 'ollama', name: 'CodeLlama', maxTokens: 16384, supportsTools: false, supportsStreaming: false },
    { id: 'deepseek-coder-v2', provider: 'ollama', name: 'DeepSeek Coder V2', maxTokens: 16384, supportsTools: false, supportsStreaming: false },
    { id: 'qwen2.5-coder:7b', provider: 'ollama', name: 'Qwen 2.5 Coder 7B', maxTokens: 32768, supportsTools: false, supportsStreaming: false },
    { id: 'qwen2.5-coder:14b', provider: 'ollama', name: 'Qwen 2.5 Coder 14B', maxTokens: 32768, supportsTools: false, supportsStreaming: false },
    { id: 'qwen2.5-coder:32b', provider: 'ollama', name: 'Qwen 2.5 Coder 32B', maxTokens: 32768, supportsTools: false, supportsStreaming: false },
  ];

  for (const model of models) {
    modelRegistry.register(model);
  }
}

registerBuiltinModels();
