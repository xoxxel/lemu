import type { CoderEngine } from './types';

export class CoderEngineRegistry {
  private engines = new Map<string, CoderEngine>();
  private defaultId: string | null = null;

  register(id: string, engine: CoderEngine): void {
    this.engines.set(id, engine);
    if (!this.defaultId) this.defaultId = id;
  }

  get(id: string): CoderEngine | undefined {
    return this.engines.get(id);
  }

  getDefault(): CoderEngine | undefined {
    if (this.defaultId) return this.engines.get(this.defaultId);
    return this.engines.values().next().value;
  }

  setDefault(id: string): void {
    if (!this.engines.has(id)) throw new Error(`Engine '${id}' not registered`);
    this.defaultId = id;
  }

  getDefaultId(): string | null {
    return this.defaultId;
  }

  getAll(): CoderEngine[] {
    return Array.from(this.engines.values());
  }

  has(id: string): boolean {
    return this.engines.has(id);
  }

  remove(id: string): boolean {
    const removed = this.engines.delete(id);
    if (this.defaultId === id) {
      this.defaultId = this.engines.keys().next().value ?? null;
    }
    return removed;
  }

  clear(): void {
    this.engines.clear();
    this.defaultId = null;
  }
}
