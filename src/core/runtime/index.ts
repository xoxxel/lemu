import type { ComponentType } from 'react';
import { registry } from '../commands/registry';
import { PluginRegistry, PluginLoader, type PluginContext, type AppRenderContext, type CommandExecutedPayload, type PluginInputPayload, type PluginInputResult } from '../plugin-system';
import { CoderEngineRegistry, DefaultCoderEngine, AiderCoderEngine } from '../coder';
import type { CoderEngine } from '../coder';
import { eventBus, RuntimeEventTypes, DomainEventTypes } from '../events';
import { executor } from '../executor';
import { ActionRegistry } from '../actions';
import { FeedbackService, type FeedbackEvent } from '../feedback';
import { fuzzyMatch, sortByScore } from '../autocomplete';
import type { Command, ParsedCommand, CommandResult } from '../commands/types';
import type { PluginAction } from '../actions/types';
import { appContext } from '../context';
import { intentPipeline } from '../pipeline';
import type { Intent } from '../pipeline/types';
import { orchestrator } from '../orchestrator/orchestrator';
import { editPipeline } from '../orchestrator';
import { providerRegistry, modelRegistry, registerDefaultProviders, applyAISettingsFromRegistry, applyProviderSettings, resolveProviderConfig, resolveDefaultProviderId } from '../ai';
import type { ProviderRegistry } from '../ai/provider-registry';
import type { ModelRegistry } from '../ai/model-registry';
import type { ProviderConfig } from '../ai/types';
import type { SettingsScope } from '../settings/types';
import { registerRuntimeSettings, settingsRegistry } from '../settings';
import { grammarRegistry, suggestionEngine } from '../grammar';
import type { GrammarContext, GrammarSuggestion } from '../grammar';
import { registry as cmdRegistry } from '../commands/registry';
import { OwnershipManager, type OwnershipState } from '../ownership';
import { OperationRegistry, TransactionPipeline, replaceHandler, insertHandler, deleteHandler, aiTransformHandler, ScopeCapabilityRegistry, parseScope } from '../operations';
import { resolveScopeNode } from '../operations/scope/resolver';
import type { OperationResult, PipelineContext, Operation } from '../operations';
import type { ScopeNode, ResolvedScope } from '../operations/scope/types';

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
    context: appContext,
    getSettings: <T>() => ({}) as T,
    api: { call() { throw new Error('API not available (no manifest.apis)'); }, getUrl() { throw new Error('API not available (no manifest.apis)'); } },
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
  processPluginInput(payload: PluginInputPayload): Promise<PluginInputResult | void>;
  init(plugins: import('../plugin-system/types').Plugin[]): Promise<void>;
  destroy(): Promise<void>;
  submitIntent(intent: Omit<Intent, 'id' | 'timestamp'>): Promise<import('../pipeline/types').IntentRecord>;
  getContext(): typeof appContext;
  getPipeline(): typeof intentPipeline;
  getEditPipeline(): typeof editPipeline;
  getAIProviderRegistry(): ProviderRegistry;
  getAIModelRegistry(): ModelRegistry;
  grammar: {
    suggest(input: string, context: GrammarContext): GrammarSuggestion[];
    execute(input: string, context: GrammarContext, deps: {
      addTab: (type: string, title: string, state?: Record<string, unknown>) => string;
      pin: () => void;
      unpin: () => void;
    }): Promise<import('../grammar/types').ExecuteResult>;
  };
  ownership: {
    acquire(pluginId: string, actionId: string, tabType: string, tabId: string | null): boolean;
    release(pluginId?: string): boolean;
    getOwner(): OwnershipState | null;
    isOwnedBy(pluginId: string): boolean;
    hasOwner(): boolean;
    releaseOnRootTrigger(): void;
  };
  operations: {
    registry: OperationRegistry;
    pipeline: TransactionPipeline;
    run(op: Operation, ctx: PipelineContext): Promise<OperationResult>;
  };
  scope: {
    parse(input: string): { node: ScopeNode | null; remaining: string };
    resolve(node: ScopeNode, ctx: PipelineContext): ResolvedScope;
    capabilities: ScopeCapabilityRegistry;
  };
  coderEngines: {
    registry: CoderEngineRegistry;
    getDefault(): CoderEngine | undefined;
    get(id: string): CoderEngine | undefined;
  };
  /** Set by App.tsx — provides the active editor tab's state for commands */
  editorContext: PipelineContext;
}

// ---------------------------------------------------------------------------
// Provider diagnostics helpers
// ---------------------------------------------------------------------------

function formatDefaultProviderLabel(id: string): string {
  const defId = providerRegistry.getDefaultProviderId();
  return id === defId ? '* ' : '  ';
}

function providerStatusBadge(p: { id: string }): string {
  const provider = providerRegistry.get(p.id);
  if (!provider) return 'unregistered';
  return 'registered';
}

function padRight(s: string, len: number): string {
  return (s + ' '.repeat(len)).slice(0, len);
}

async function formatProviderTable(): Promise<string> {
  const defId = providerRegistry.getDefaultProviderId();
  const lines: string[] = [];
  lines.push('Provider     Status          Default  Endpoint                              Model');
  lines.push('-'.repeat(90));

  for (const id of providerRegistry.ids) {
    const provider = providerRegistry.get(id);
    const def = providerRegistry.getDefinition(id);
    const isDefault = id === defId;
    const endpoint = def?.endpoint ?? '?';
    const model = def?.defaultModel ?? '?';
    const regStatus = provider ? 'registered' : 'missing';

    const marker = isDefault ? '* ' : '  ';
    const idPart = padRight(id, 13);
    const status = regStatus === 'registered' ? 'registered' : 'missing';
    const statusPart = padRight(status, 16);
    const defPart = isDefault ? 'yes       ' : 'no        ';
    const epPart = padRight(endpoint, 39);
    lines.push(`${marker}${idPart}${statusPart}${defPart}${epPart}${model}`);
  }

  lines.push('');
  lines.push('Commands:');
  lines.push('  *>providers ping <id>        Check provider connectivity');
  lines.push('  *>providers models <id>       List available models');
  lines.push('  *>providers set-default <id>  Change default provider');
  lines.push('  *>providers reload [id]       Re-read settings for provider(s)');

  return lines.join('\n');
}

async function handleProviderPing(targetId: string): Promise<string> {
  const id = targetId || providerRegistry.getDefaultProviderId() || 'ollama';
  const provider = providerRegistry.get(id);
  if (!provider) {
    return [
      'Provider Error:',
      `  provider: ${id}`,
      `  reason: not registered`,
    ].join('\n');
  }

  const def = providerRegistry.getDefinition(id);
  const endpoint = def?.endpoint ?? provider.endpoint;
  const model = def?.defaultModel ?? provider.model;

  const health = await provider.checkHealth();
  if (health.ok) {
    return [
      `Provider:   ${id}`,
      `Status:     connected`,
      `Endpoint:   ${endpoint}`,
      `Model:      ${model}`,
      `Latency:    ${health.latency}ms`,
      `Models:     ${health.modelCount ?? '?'} available`,
      health.models && health.models.length > 0 ? `  (${health.models.slice(0, 5).join(', ')}${health.models.length > 5 ? `... +${health.models.length - 5} more` : ''})` : '',
      health.error ? `Warning:    ${health.error}` : '',
    ].filter(Boolean).join('\n');
  }

  return [
    'Provider Error:',
    `  provider: ${id}`,
    `  endpoint: ${endpoint}`,
    `  reason:   ${health.error || 'unknown'}`,
    `  latency:  ${health.latency}ms`,
  ].join('\n');
}

function handleProviderModels(targetId: string): string {
  const id = targetId || providerRegistry.getDefaultProviderId() || 'ollama';
  const def = providerRegistry.getDefinition(id);
  if (!def) return `Provider '${id}' not registered.`;

  const allModels = modelRegistry.getByProvider(id);
  const lines: string[] = [`Models for ${id}:`];
  if (allModels.length > 0) {
    for (const m of allModels) {
      lines.push(`  ${m.id.padEnd(25)} ${m.name.padEnd(35)} maxTokens:${(m.maxTokens ?? '?').toString().padEnd(6)} tools:${m.supportsTools ? 'yes' : 'no '}`);
    }
  } else {
    lines.push('  (no models in registry for this provider)');
  }
  lines.push('');
  lines.push('Use *>providers ping <id> to query live models from the provider endpoint.');
  return lines.join('\n');
}

function handleSetDefaultProvider(targetId: string): string {
  if (!targetId) return 'Usage: *>providers set-default <provider-id>';
  if (!providerRegistry.has(targetId)) return `Provider '${targetId}' not registered.`;
  providerRegistry.setDefaultProvider(targetId);
  settingsRegistry.set('ai.defaultProvider', targetId);
  return `Default provider set to '${targetId}'.`;
}

function handleReloadProviders(): string {
  applyAISettingsFromRegistry();
  return 'AI provider settings re-applied from registry.';
}

// ---------------------------------------------------------------------------
// Grammar registration
// ---------------------------------------------------------------------------

function registerAllWithGrammar(actRegistry: ActionRegistry): void {
  // Register all commands from command registry
  for (const cmd of cmdRegistry.getAll()) {
    grammarRegistry.register({
      id: cmd.name,
      namespace: 'global',
      title: cmd.description || cmd.name,
      description: cmd.description,
      usage: cmd.usage,
      examples: cmd.examples?.map(e => e.input),
      execute: async (ctx) => {
        const parsed = { name: cmd.name, args: (ctx.node as import('../grammar/types').CommandNode).args, raw: ctx.node.raw };
        const result = await executor.execute(parsed);
        return result.message;
      },
    });
  }

  // Register global actions from actionRegistry
  const globalActions = actRegistry.getForType('*');
  for (const act of globalActions) {
    grammarRegistry.register({
      id: act.id,
      namespace: 'runtime',
      title: act.title || act.id,
      description: act.description,
      aliases: act.aliases,
      execute: async (ctx) => {
        const actionCtx = {
          tabId: ctx.context.activeTabId,
          tabType: ctx.context.activeTabType,
          tabState: {},
          query: (ctx.node as import('../grammar/types').ActionNode).query,
          pinned: ctx.context.pinned,
          pin: ctx.pin,
          unpin: ctx.unpin,
          addTab: ctx.addTab,
        };
        return act.handler(actionCtx);
      },
    });
  }
}

// ---------------------------------------------------------------------------

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
  const ownershipManager = new OwnershipManager();
  const scopeCapabilityRegistry = new ScopeCapabilityRegistry();
  const operationRegistry = new OperationRegistry();
  operationRegistry.register(replaceHandler);
  operationRegistry.register(insertHandler);
  operationRegistry.register(deleteHandler);
  operationRegistry.register(aiTransformHandler);
  for (const h of operationRegistry.getAll()) {
    scopeCapabilityRegistry.register(h.type, h.supportedScopes);
  }
  const operationPipeline = new TransactionPipeline(operationRegistry);
  const coderEngineRegistry = new CoderEngineRegistry();
  const defaultCoderEngine = new DefaultCoderEngine(providerRegistry);
  const aiderCoderEngine = new AiderCoderEngine();
  coderEngineRegistry.register('default', defaultCoderEngine);
  coderEngineRegistry.register('aider', aiderCoderEngine);
  coderEngineRegistry.setDefault('default');
  const editorContext: PipelineContext = { document: '', path: '', state: {} };
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

  const globalActions: PluginAction[] = [
    {
      id: 'settings',
      title: 'Open Settings',
      description: 'Open the runtime settings tab',
      handler: async (ctx) => {
        ctx.addTab?.('settings', 'Settings', {});
        return 'Opened settings tab. Use j/k to navigate, Enter to edit, >filter to narrow.';
      },
    },
    {
      id: 'new-session',
      title: 'New Terminal Session',
      description: 'Create a new terminal session',
      aliases: ['terminal', 'session'],
      handler: async () => {
        return 'Use :bash to start a new terminal session.';
      },
    },
    {
      id: 'providers',
      title: 'AI Provider Diagnostics',
      description: 'Show provider status, ping, models, set-default. Usage: *>providers [ping|models|set-default|reload] [id]',
      aliases: ['ai-status', 'provider'],
      handler: async (ctx) => {
        const query = (ctx.query || '').trim();
        const parts = query.split(/\s+/);
        const subCmd = parts[0]?.toLowerCase();
        const subArg = parts.slice(1).join(' ');

        if (subCmd === 'ping') return handleProviderPing(subArg);
        if (subCmd === 'models') return handleProviderModels(subArg);
        if (subCmd === 'set-default' && subArg) return handleSetDefaultProvider(subArg);
        if (subCmd === 'reload') return handleReloadProviders();
        return formatProviderTable();
      },
    },
    {
      id: 'reload',
      title: 'Reload Runtime',
      description: 'Re-read settings and refresh runtime state',
      handler: async () => {
        applyAISettingsFromRegistry();
        return 'Runtime settings re-applied from registry.';
      },
    },
  ];

  for (const action of globalActions) {
    actionRegistry.register('*', action);
  }

  const intents: Runtime['submitIntent'] = async (partial) => {
    const intent: Intent = {
      ...partial,
      id: `intent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    return intentPipeline.submit(intent);
  };

  // Subscribe to settings:changed to auto-update provider configs
  eventBus.on('settings:changed', (payload) => {
    const ev = payload as { key: string; value: unknown; scope: SettingsScope };
    if (ev.key.startsWith('providers.')) {
      const providerId = ev.key.split('.')[1];
      applyProviderSettings(providerId);
    } else if (ev.key === 'ai.defaultProvider') {
      applyAISettingsFromRegistry();
    }
  });

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

    async processPluginInput(payload: PluginInputPayload): Promise<PluginInputResult | void> {
      const plugin = pluginRegistry.getPluginByTabType(payload.tabType);
      if (!plugin || !plugin.onInput) return;
      console.log('[RUNTIME] processPluginInput: tabType=%s input=%s', payload.tabType, payload.input);
      return plugin.onInput(payload);
    },

    async execute(parsed: ParsedCommand): Promise<CommandResult> {
      console.log('[RUNTIME] execute() called: name=%s args=%j type=%s', parsed.name, parsed.args, 'command');
      const active = activePlugins();
      console.log('[RUNTIME] Active plugins: %d', active.length);

      const start = Date.now();

      eventBus.emit(RuntimeEventTypes.CommandStart, {
        timestamp: start,
        command: parsed.name,
        args: parsed.args,
      });
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

        eventBus.emit(RuntimeEventTypes.CommandError, {
          timestamp: Date.now(),
          command: parsed.name,
          args: parsed.args,
          message: result.message,
          suggestion,
        });
      } else {
        eventBus.emit(RuntimeEventTypes.CommandSuccess, {
          timestamp: Date.now(),
          command: parsed.name,
          args: parsed.args,
          duration,
          message: result.message,
        });
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

    submitIntent: intents,
    getContext: () => appContext,
    getPipeline: () => intentPipeline,
    getEditPipeline: () => editPipeline,
    getAIProviderRegistry: () => providerRegistry,
    getAIModelRegistry: () => modelRegistry,

    grammar: {
      suggest(input: string, context: GrammarContext) {
        return suggestionEngine.suggest(input, context);
      },
      async execute(input: string, context: GrammarContext, deps) {
        return grammarRegistry.execute(input, context, deps);
      },
    },
    ownership: {
      acquire: (pluginId, actionId, tabType, tabId) => ownershipManager.acquire(pluginId, actionId, tabType, tabId),
      release: (pluginId) => ownershipManager.release(pluginId),
      getOwner: () => ownershipManager.getOwner(),
      isOwnedBy: (pluginId) => ownershipManager.isOwnedBy(pluginId),
      hasOwner: () => ownershipManager.hasOwner(),
      releaseOnRootTrigger: () => ownershipManager.releaseOnRootTrigger(),
    },
    operations: {
      registry: operationRegistry,
      pipeline: operationPipeline,
      async run(op: Operation, ctx: PipelineContext): Promise<OperationResult> {
        return operationPipeline.run(op, ctx);
      },
    },
    scope: {
      parse(input: string) { return parseScope(input); },
      resolve(node: ScopeNode, ctx: PipelineContext): ResolvedScope {
        return resolveScopeNode(node, ctx);
      },
      capabilities: scopeCapabilityRegistry,
    },
    coderEngines: {
      registry: coderEngineRegistry,
      getDefault: () => coderEngineRegistry.getDefault(),
      get: (id: string) => coderEngineRegistry.get(id),
    },
    editorContext,

    async init(plugins) {
      registerRuntimeSettings();
      registerDefaultProviders();
      applyAISettingsFromRegistry();
      console.log('[RUNTIME] init() called with %d plugins', plugins.length);
      await orchestrator.init();
      await pluginLoader.loadAll(plugins);
      console.log('[RUNTIME] All plugins loaded. Registry has %d commands', registry.getAll().length);

      registerAllWithGrammar(actionRegistry);

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

      eventBus.emit(RuntimeEventTypes.RuntimeReady, { timestamp: Date.now() });
      console.log('[RUNTIME] init() complete');
    },

    async destroy() {
      console.log('[RUNTIME] destroy()');
      feedbackService.destroy();
      appContext.clear();
      for (const plugin of activePlugins()) {
        if (plugin.onCleanup) {
          try { await plugin.onCleanup(); } catch { }
        }
        if (plugin.deactivate) {
          try { await plugin.deactivate(pluginContext); } catch { }
        }
      }
      appWrappers.length = 0;
    },
  };

  return runtime;
}
