import { appContext } from '../context';
import type { SettingDefinition, SettingRow, SettingsScope, SettingsSource } from './types';
import { eventBus } from '../events';

const VALUES_KEY = 'runtime:settings:values';
const SCOPE_KEY = 'runtime:settings:scope';
const SESSION_KEY = 'runtime:settings:session';

export class SettingsRegistry {
  private definitions = new Map<string, SettingDefinition>();

  define(def: SettingDefinition): void {
    this.definitions.set(def.key, def);
    if (def.defaultValue !== undefined && !appContext.has(`${VALUES_KEY}:system:${def.key}`)) {
      appContext.set(`${VALUES_KEY}:system:${def.key}`, def.defaultValue);
    }
  }

  defineMany(defs: SettingDefinition[]): void {
    for (const def of defs) this.define(def);
  }

  getDefinition(key: string): SettingDefinition | undefined {
    return this.definitions.get(key);
  }

  getAllDefinitions(): SettingDefinition[] {
    return Array.from(this.definitions.values());
  }

  get(key: string): unknown {
    const session = appContext.get(`${SESSION_KEY}:${key}`);
    if (session !== undefined) return session;
    const user = appContext.get(`${VALUES_KEY}:user:${key}`);
    if (user !== undefined) return user;
    const system = appContext.get(`${VALUES_KEY}:system:${key}`);
    if (system !== undefined) return system;
    const def = this.definitions.get(key);
    return def?.defaultValue;
  }

  set(key: string, value: unknown): void {
    const prev = this.get(key);
    const scope = this.getScope();
    appContext.set(`${VALUES_KEY}:${scope}:${key}`, value);
    appContext.set(`runtime:settings:changed:${key}`, { key, value, prev, scope, timestamp: Date.now() });
    eventBus.emit('settings:changed', { key, value, prev, scope, timestamp: Date.now() });
  }

  setSession(key: string, value: unknown): void {
    appContext.set(`${SESSION_KEY}:${key}`, value);
    eventBus.emit('settings:changed', { key, value, prev: null, scope: 'session', timestamp: Date.now() });
  }

  unset(key: string): void {
    const scope = this.getScope();
    appContext.remove(`${VALUES_KEY}:${scope}:${key}`);
    appContext.remove(`${SESSION_KEY}:${key}`);
    eventBus.emit('settings:changed', { key, value: undefined, prev: null, scope, timestamp: Date.now() });
  }

  getScope(): SettingsScope {
    return (appContext.get(SCOPE_KEY) as SettingsScope) || 'system';
  }

  setScope(scope: SettingsScope): void {
    appContext.set(SCOPE_KEY, scope);
    eventBus.emit('settings:scope-changed', { scope, timestamp: Date.now() });
  }

  unsetScope(key: string, scope: SettingsScope): void {
    appContext.remove(`${VALUES_KEY}:${scope}:${key}`);
    eventBus.emit('settings:changed', { key, value: undefined, prev: null, scope, timestamp: Date.now() });
  }

  getSource(key: string): SettingsSource {
    if (appContext.has(`${SESSION_KEY}:${key}`)) return 'session';
    if (appContext.has(`${VALUES_KEY}:user:${key}`)) return 'user';
    return 'default';
  }

  getAll(scope?: SettingsScope, filter?: string): SettingRow[] {
    const activeScope = scope || this.getScope();
    const rows: SettingRow[] = [];

    for (const [key, def] of this.definitions) {
      if (filter && !key.toLowerCase().includes(filter.toLowerCase())) continue;

      const source = this.getSource(key);
      const value = this.get(key);
      const defaultValue = def.defaultValue;

      rows.push({
        key,
        value,
        defaultValue,
        definition: def,
        source,
        scope: activeScope,
      });
    }

    rows.sort((a, b) => a.key.localeCompare(b.key));
    return rows;
  }

  onChange(key: string, fn: (key: string, value: unknown, prev: unknown) => void): () => void {
    return appContext.onChange(`${VALUES_KEY}:user:${key}`, fn);
  }

  onAnyChange(fn: (payload: { key: string; value: unknown; prev: unknown; scope: SettingsScope; timestamp: number }) => void): () => void {
    const handler = (payload?: unknown) => {
      if (payload && typeof payload === 'object') {
        fn(payload as { key: string; value: unknown; prev: unknown; scope: SettingsScope; timestamp: number });
      }
    };
    eventBus.on('settings:changed', handler);
    return () => {}; // simplified cleanup
  }

  getKeys(): string[] {
    return Array.from(this.definitions.keys());
  }

  clear(): void {
    this.definitions.clear();
  }
}

export const settingsRegistry = new SettingsRegistry();
