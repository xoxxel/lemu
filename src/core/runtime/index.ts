import type { ComponentType } from 'react';
import { registry } from '../commands/registry';
import { PluginRegistry, PluginLoader, type PluginContext, type AppRenderContext, type CommandExecutedPayload } from '../plugin-system';
import { eventBus } from '../events/event-bus';
import { executor } from '../executor';
import { ActionRegistry } from '../actions';
import { FeedbackService, type FeedbackEvent } from '../feedback';
import { fuzzyMatch, sortByScore } from '../autocomplete';
import type { Command, ParsedCommand, CommandResult } from '../commands/types';
import type { PluginAction } from '../actions/types';

const appWrappers: unknown[] = [];

export function getAppWrappers(): unknown[] {
  return appWrappers;
}

function suggestCommand(unknown: string): string | null {
  const allCommands = registry.getAll();
  const items = allCommands.map(c => ({
    value: c.name,
    description: c.description,
    type: 'command' as const,
  }));
  const matches = fuzzyMatch(unknown, items);
  const sorted = sortByScore(unknown, matches);
  return sorted.length > 0 ? '/' + sorted[0].value : null;
}

function getCommandUsage(cmdName: string): string | null {
  const cmd = registry.get(cmdName);
  return cmd?.usage ?? null;
}

function deriveCommandSuggestion(parsed: ParsedCommand, result: CommandResult): string | undefined {
  if (result.success) return undefined;
  const suggestion = parsed.name ? (suggestCommand(parsed.name) ?? undefined) : undefined;
  const usage = getCommandUsage(parsed.name);

  if (result.message.startsWith('Unknown command') && suggestion) {
    return 'Did you mean ' + suggestion + '?';
  }
  if (!result.message.startsWith('Unknown command') && usage) {
    return 'Example: ' + usage;
  }
  return suggestion;
}

function createPluginContext(
  actionRegistry: ActionRegistry,
  viewComponentMap: Record<string, ComponentType<{ state: Record<string, unknown> }>>,
  viewMetaMap: Record<string, { label: string; icon: string }>,
): PluginContext {
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
    actions: {
      register: (type: string, action: PluginAction) => actionRegistry.register(type, action),
    },
    views: {
      register(type, component, meta) {
        viewComponentMap[type] = component;
        viewMetaMap[type] = meta;
        console.log('[RUNTIME] View registered: type=%s label=%s', type, meta.label);
      },
    },
    feedback: {
      error: (msg: string, meta) => {
        const event: FeedbackEvent = { level: 'error', message: msg, ...meta, dismissible: true };
        console.log('[FEEDBACK] source=plugin level=error message=%s', msg);
        eventBus.emit('feedback', event);
      },
      warning: (msg: string, meta) => {
        const event: FeedbackEvent = { level: 'warning', message: msg, ...meta, dismissible: true };
        console.log('[FEEDBACK] source=plugin level=warning message=%s', msg);
        eventBus.emit('feedback', event);
      },
      info: (msg: string, meta) => {
        const event: FeedbackEvent = { level: 'info', message: msg, ...meta, dismissible: true };
        console.log('[FEEDBACK] source=plugin level=info message=%s', msg);
        eventBus.emit('feedback', event);
      },
      success: (msg: string, meta) => {
        const event: FeedbackEvent = { level: 'success', message: msg, ...meta, dismissible: true };
        console.log('[FEEDBACK] source=plugin level=success message=%s', msg);
        eventBus.emit('feedback', event);
      },
    },
  };
}

export interface Runtime {
  pluginRegistry: PluginRegistry;
  pluginLoader: PluginLoader;
  pluginContext: PluginContext;
  actionRegistry: ActionRegistry;
  feedback: FeedbackService;
  viewComponentMap: Record<string, ComponentType<{ state: Record<string, unknown> }>>;
  viewMetaMap: Record<string, { label: string; icon: string }>;
  resolveActionsForTabType(tabType: string | null): PluginAction[] | null;
  matchAction(query: string, action: PluginAction): boolean;
  execute(parsed: ParsedCommand): Promise<CommandResult>;
  getAutocomplete(parsed: ParsedCommand): ReturnType<typeof executor.getAutocomplete>;
  init(plugins: import('../plugin-system/types').Plugin[]): Promise<void>;
  destroy(): Promise<void>;
}

export async function createRuntime(): Promise<Runtime> {
  console.log('[RUNTIME] createRuntime()');
  const actionRegistry = new ActionRegistry();
  const pluginRegistry = new PluginRegistry();
  const viewComponentMap: Record<string, ComponentType<{ state: Record<string, unknown> }>> = {};
  const viewMetaMap: Record<string, { label: string; icon: string }> = {};
  const feedbackService = new FeedbackService();
  eventBus.on('feedback', (payload) => {
    feedbackService.show(payload as FeedbackEvent);
  });
  const pluginContext = createPluginContext(actionRegistry, viewComponentMap, viewMetaMap);
  const pluginLoader = new PluginLoader(pluginRegistry, pluginContext);

  const activePlugins = () => pluginRegistry.getActive();

  const resolveActionsForTabType = (tabType: string | null) => {
    if (!tabType) return null;
    const plugin = pluginRegistry.getPluginByTabType(tabType);
    if (!plugin) return null;
    if (plugin.getActions) {
      return plugin.getActions();
    }
    return plugin.actions ?? [];
  };

  const matchAction = (query: string, action: PluginAction) => {
    const lower = query.toLowerCase();
    if (action.id.toLowerCase().includes(lower)) return true;
    if (action.title?.toLowerCase().includes(lower)) return true;
    if (action.aliases?.some(a => a.toLowerCase().includes(lower))) return true;
    return false;
  };

  const runtime: Runtime = {
    pluginRegistry,
    pluginLoader,
    pluginContext,
    actionRegistry,
    feedback: feedbackService,
    viewComponentMap,
    viewMetaMap,
    resolveActionsForTabType,
    matchAction,

    async execute(parsed: ParsedCommand): Promise<CommandResult> {
      console.log('[RUNTIME] execute() called: name=%s args=%j type=%s', parsed.name, parsed.args, 'command');
      const active = activePlugins();
      console.log('[RUNTIME] Active plugins: %d', active.length);

      const start = Date.now();
      console.log('[RUNTIME] Forwarding to executor.execute()');
      const result = await executor.execute(parsed);
      const duration = Date.now() - start;
      console.log('[RUNTIME] executor.execute() returned: success=%s message=%s', result.success, result.message?.slice(0, 100));

      if (!result.success) {
        const suggestion = deriveCommandSuggestion(parsed, result);
        const event: FeedbackEvent = {
          level: 'error',
          message: result.message,
          suggestion,
          command: parsed.name,
          dismissible: true,
        };
        console.log('[FEEDBACK] source=runtime level=error message=%s', result.message);
        if (suggestion) console.log('[FEEDBACK] suggestion generated: %s', suggestion);
        eventBus.emit('feedback', event);
      }

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
      feedbackService.destroy();
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
