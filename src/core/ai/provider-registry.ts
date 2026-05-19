import type { AIProvider, ProviderDefinition } from './types';

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private definitions = new Map<string, ProviderDefinition>();
  private defaultProviderId: string | null = null;

  register(id: string, provider: AIProvider, def?: ProviderDefinition): void {
    this.providers.set(id, provider);
    if (def) this.definitions.set(id, def);
    if (!this.defaultProviderId) this.defaultProviderId = id;
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  remove(id: string): boolean {
    const removed = this.providers.delete(id);
    this.definitions.delete(id);
    if (this.defaultProviderId === id) {
      this.defaultProviderId = this.providers.keys().next().value ?? null;
    }
    return removed;
  }

  getDefinition(id: string): ProviderDefinition | undefined {
    return this.definitions.get(id);
  }

  getDefaultProvider(): AIProvider | undefined {
    if (this.defaultProviderId) return this.providers.get(this.defaultProviderId);
    return this.providers.values().next().value;
  }

  setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) throw new Error(`Provider '${id}' not registered`);
    this.defaultProviderId = id;
  }

  getDefaultProviderId(): string | null {
    return this.defaultProviderId;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  get ids(): string[] {
    return Array.from(this.providers.keys());
  }

  clear(): void {
    this.providers.clear();
    this.definitions.clear();
    this.defaultProviderId = null;
  }
}

export const providerRegistry = new ProviderRegistry();
