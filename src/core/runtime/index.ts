import { registry } from '../commands/registry';
import { PluginRegistry, PluginLoader, type PluginContext, type AppRenderContext, type CommandExecutedPayload } from '../plugin-system';
import { eventBus } from '../events/event-bus';
import { executor } from '../executor';
import type { Command, ParsedCommand, CommandResult } from '../commands/types';

const appWrappers: unknown[] = [];

export function getAppWrappers(): unknown[] {
  return appWrappers;
}

function createPluginContext(): PluginContext {
  return {
    commands: {
      register: (cmd: Command) => registry.register(cmd),
      get: (name: string) => registry.get(name),
      findByAlias: (alias: string) => registry.findByAlias(alias),
      getAll: () => registry.getAll(),
    },
    events: eventBus,
    shell: {
      sendInput() {},
      createSession() {},
      destroySession() {},
      switchSession() {},
      listSessions() { return []; },
    },
    workspace: {
      addMessage() { return ''; },
      updateMessage() {},
      getMessages() { return []; },
    },
    storage: {
      get() { return undefined; },
      set() {},
      remove() {},
    },
    ui: {
      showPanel() {},
      hidePanel() {},
      registerAppWrapper(wrapper: unknown) {
        console.log('[RUNTIME] registerAppWrapper called');
        appWrappers.push(wrapper);
      },
    },
    config: {},
  };
}

export interface Runtime {
  pluginRegistry: PluginRegistry;
  pluginLoader: PluginLoader;
  pluginContext: PluginContext;
  execute(parsed: ParsedCommand): Promise<CommandResult>;
  getAutocomplete(parsed: ParsedCommand): ReturnType<typeof executor.getAutocomplete>;
  init(plugins: import('../plugin-system/types').Plugin[]): Promise<void>;
  destroy(): Promise<void>;
}

export async function createRuntime(): Promise<Runtime> {
  console.log('[RUNTIME] createRuntime()');
  const pluginRegistry = new PluginRegistry();
  const pluginContext = createPluginContext();
  const pluginLoader = new PluginLoader(pluginRegistry, pluginContext);

  const activePlugins = () => pluginRegistry.getActive();

  const runtime: Runtime = {
    pluginRegistry,
    pluginLoader,
    pluginContext,

    async execute(parsed: ParsedCommand): Promise<CommandResult> {
      console.log('[RUNTIME] execute() called: name=%s args=%j type=%s', parsed.name, parsed.args, 'command');
      const active = activePlugins();
      console.log('[RUNTIME] Active plugins: %d', active.length);

      const start = Date.now();
      console.log('[RUNTIME] Forwarding to executor.execute()');
      const result = await executor.execute(parsed);
      const duration = Date.now() - start;
      console.log('[RUNTIME] executor.execute() returned: success=%s message=%s', result.success, result.message?.slice(0, 100));

      const payload: CommandExecutedPayload = {
        command: parsed.name,
        args: parsed.args,
        result,
        duration,
      };
      console.log('[RUNTIME] Emitting command:executed event');
      eventBus.emit('command:executed', payload);

      for (const plugin of active) {
        if (plugin.onCommandExecuted) {
          try {
            console.log('[RUNTIME] Calling onCommandExecuted for plugin: %s', plugin.id);
            await plugin.onCommandExecuted(payload);
            console.log('[RUNTIME] onCommandExecuted complete for plugin: %s', plugin.id);
          } catch (err) {
            console.log('[RUNTIME] onCommandExecuted threw for plugin %s: %o', plugin.id, err);
          }
        }
      }

      console.log('[RUNTIME] execute() returning result');
      return result;
    },

    getAutocomplete(parsed: ParsedCommand) {
      console.log('[RUNTIME] getAutocomplete() for name=%s', parsed.name);
      return executor.getAutocomplete(parsed);
    },

    async init(plugins) {
      console.log('[RUNTIME] init() called with %d plugins', plugins.length);
      await pluginLoader.loadAll(plugins);
      console.log('[RUNTIME] All plugins loaded. Registry has %d commands', registry.getAll().length);

      const renderCtx: AppRenderContext = {
        registerWrapper(wrapper: unknown) {
          console.log('[RUNTIME] AppRenderContext registerWrapper called');
          appWrappers.push(wrapper);
        },
      };

      for (const plugin of activePlugins()) {
        if (plugin.onAppRender) {
          try {
            console.log('[RUNTIME] Calling onAppRender for plugin: %s', plugin.id);
            await plugin.onAppRender(renderCtx);
          } catch (err) {
            console.log('[RUNTIME] onAppRender threw for plugin %s: %o', plugin.id, err);
          }
        }
      }

      for (const plugin of activePlugins()) {
        if (plugin.onReady) {
          try {
            console.log('[RUNTIME] Calling onReady for plugin: %s', plugin.id);
            await plugin.onReady(pluginContext);
          } catch (err) {
            console.log('[RUNTIME] onReady threw for plugin %s: %o', plugin.id, err);
          }
        }
      }

      eventBus.emit('runtime:ready', {});
      console.log('[RUNTIME] init() complete');
    },

    async destroy() {
      console.log('[RUNTIME] destroy()');
      for (const plugin of activePlugins()) {
        if (plugin.onCleanup) {
          try {
            await plugin.onCleanup();
          } catch { /* isolate */ }
        }
        if (plugin.deactivate) {
          try {
            await plugin.deactivate(pluginContext);
          } catch { /* isolate */ }
        }
      }
      appWrappers.length = 0;
    },
  };

  return runtime;
}
