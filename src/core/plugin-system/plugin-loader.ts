import type { Plugin, PluginContext } from './types';

export class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private active = new Set<string>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
    console.log('[PLUGIN_REGISTRY] Registered plugin: %s (%s)', plugin.id, plugin.name);
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
}

export class PluginLoader {
  constructor(
    private registry: PluginRegistry,
    private ctx: PluginContext,
  ) {}

  async load(plugin: Plugin, config?: Record<string, unknown>): Promise<void> {
    console.log('[PLUGIN_LOADER] Loading plugin: %s (%s)', plugin.id, plugin.name);
    this.registry.register(plugin);

    let resolvedConfig = config ?? {};
    if (plugin.onConfig) {
      console.log('[PLUGIN_LOADER] Calling onConfig for %s', plugin.id);
      resolvedConfig = await plugin.onConfig(resolvedConfig);
      console.log('[PLUGIN_LOADER] onConfig complete for %s', plugin.id);
    }
    this.ctx.config = resolvedConfig;

    if (plugin.commands) {
      console.log('[PLUGIN_LOADER] Registering %d commands for %s: %j', plugin.commands.length, plugin.id, plugin.commands.map(c => c.name));
      for (const cmd of plugin.commands) {
        this.ctx.commands.register(cmd);
      }
    } else {
      console.log('[PLUGIN_LOADER] No commands in plugin.commands for %s', plugin.id);
    }

    console.log('[PLUGIN_LOADER] Calling activate for %s', plugin.id);
    await plugin.activate(this.ctx);
    console.log('[PLUGIN_LOADER] activate complete for %s', plugin.id);

    this.ctx.events.emit('plugin:activated', { id: plugin.id, name: plugin.name });
    console.log('[PLUGIN_LOADER] Plugin loaded successfully: %s', plugin.id);
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.registry.get(pluginId);
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    if (plugin.onCleanup) {
      console.log('[PLUGIN_LOADER] Calling onCleanup for %s', pluginId);
      await plugin.onCleanup();
    }

    if (plugin.deactivate) {
      console.log('[PLUGIN_LOADER] Calling deactivate for %s', pluginId);
      await plugin.deactivate(this.ctx);
    }

    this.ctx.events.emit('plugin:deactivated', { id: pluginId });
  }

  async loadAll(plugins: Plugin[]): Promise<void> {
    console.log('[PLUGIN_LOADER] loadAll() called with %d plugins: %j', plugins.length, plugins.map(p => p.id));
    for (const plugin of plugins) {
      await this.load(plugin);
    }
    console.log('[PLUGIN_LOADER] loadAll() complete');
  }
}
