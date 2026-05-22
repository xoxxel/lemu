import type { Plugin, PluginContext } from './types';
import { eventBus } from '../events';
import { appContext } from '../context';
import { createApiService } from './api-service';
import { resolveSettings, saveSettings } from './settings-resolver';

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private active = new Set<string>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  activate(id: string): void {
    this.active.add(id);
  }

  deactivate(id: string): void {
    this.active.delete(id);
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  isActive(id: string): boolean {
    return this.active.has(id);
  }

  getActive(): Plugin[] {
    return this.getAll().filter((p) => this.active.has(p.id));
  }

  getPluginByTabType(tabType: string): Plugin | null {
    for (const plugin of this.plugins.values()) {
      if (plugin.views?.some(v => v.type === tabType)) {
        return plugin;
      }
    }
    return null;
  }
}

export class PluginLoader {
  constructor(
    private registry: PluginRegistry,
    private ctx: PluginContext,
  ) {}

  async load(plugin: Plugin, overrides?: Record<string, unknown>): Promise<void> {
    this.registry.register(plugin);

    // ── Process Manifest (static, architectural) ──────────────────────────

    if (plugin.manifest) {
      appContext.set(`plugin:manifest:${plugin.id}`, plugin.manifest);

      if (plugin.manifest.apis) {
        const apiService = createApiService(plugin.manifest.apis);
        (this.ctx as unknown as Record<string, unknown>).api = apiService;
        appContext.set(`plugin:api:${plugin.id}`, apiService);
      }

      appContext.set(`plugin:manifest:resolved:${plugin.id}`, plugin.manifest);
    }

    // ── Process Settings (dynamic, user-configurable) ─────────────────────

    const defaults = plugin.settings ?? {};

    let resolvedConfig: Record<string, unknown> = { ...defaults, ...overrides };

    if (plugin.onConfig) {
      resolvedConfig = await plugin.onConfig(resolvedConfig);
    }

    this.ctx.config = resolvedConfig;

    saveSettings(plugin.id, defaults);

    const fullSettings = resolveSettings(plugin.id, defaults);
    appContext.set(`plugin:settings:resolved:${plugin.id}`, fullSettings);

    // ── Schemas ───────────────────────────────────────────────────────────

    if (plugin.settingsSchema) {
      appContext.set(`plugin:settings-schema:${plugin.id}`, plugin.settingsSchema);
    }

    // ── Inject settings accessor into context ─────────────────────────────

    (this.ctx as unknown as Record<string, unknown>).getSettings = (() => {
      return resolveSettings(plugin.id, defaults);
    });

    // ── Register runtime resources ────────────────────────────────────────

    if (plugin.commands) {
      for (const cmd of plugin.commands) {
        this.ctx.commands.register(cmd);
      }
    }

    if (plugin.actions) {
      for (const action of plugin.actions) {
        const actionType = action.type ?? '*';
        if (actionType === '*') {
          const viewTypes = plugin.views?.map((view) => view.type) ?? [];
          if (viewTypes.length > 0) {
            for (const viewType of viewTypes) {
              this.ctx.actions.register(viewType, action);
            }
          } else {
            this.ctx.actions.register('*', action);
          }
        } else {
          this.ctx.actions.register(actionType, action);
        }
      }
    }

    if (plugin.views) {
      for (const view of plugin.views) {
        this.ctx.views.register(view.type, view.component, view.meta);
      }
    }

    if (plugin.onEvent) {
      const unsub = eventBus.onAny((event, payload) => {
        plugin.onEvent!(event, payload).catch(() => {});
      });
      (plugin as unknown as Record<string, unknown>).__unsub = unsub;
    }

    if (plugin.activate) {
      await plugin.activate(this.ctx);
    }

    this.registry.activate(plugin.id);
    this.ctx.events.emit('plugin:activated', { id: plugin.id, name: plugin.name });
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    if (plugin.onCleanup) {
      await plugin.onCleanup();
    }
    if (plugin.deactivate) {
      await plugin.deactivate(this.ctx);
    }

    const unsub = (plugin as unknown as Record<string, unknown>).__unsub as (() => void) | undefined;
    if (typeof unsub === 'function') {
      try {
        unsub();
      } catch {}
      delete (plugin as unknown as Record<string, unknown>).__unsub;
    }

    this.registry.deactivate(pluginId);
    this.ctx.events.emit('plugin:deactivated', { id: pluginId });
  }

  async loadAll(plugins: Plugin[]): Promise<void> {
    for (const plugin of plugins) {
      await this.load(plugin);
    }
  }
}
