type Listener = (key: string, value: unknown, prev: unknown) => void;

export class AppContext {
  private store = new Map<string, unknown>();
  private listeners = new Map<string, Set<Listener>>();

  get<T = unknown>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T = unknown>(key: string, value: T): void {
    const prev = this.store.get(key);
    this.store.set(key, value);
    const ls = this.listeners.get(key);
    if (ls) {
      for (const fn of ls) {
        try { fn(key, value, prev); } catch { }
      }
    }
  }

  remove(key: string): void {
    const prev = this.store.get(key);
    this.store.delete(key);
    const ls = this.listeners.get(key);
    if (ls) {
      for (const fn of ls) {
        try { fn(key, undefined, prev); } catch { }
      }
    }
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  onChange(key: string, fn: Listener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(fn);
    return () => { this.listeners.get(key)?.delete(fn); };
  }

  clear(): void {
    this.store.clear();
    this.listeners.clear();
  }
}

export const appContext = new AppContext();
