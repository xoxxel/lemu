# lemu Plugin SDK

> Version 0.1.0 — Build plugins for the lemu terminal workspace.

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Folder Structure](#folder-structure)
- [Minimal Example](#minimal-example)
- [Plugin Interface](#plugin-interface)
- [Command System](#command-system)
- [Config Mode (`>`)](#config-mode-)
- [View System](#view-system)
- [Help System](#help-system-)
- [Event System](#event-system)
- [Feedback System](#feedback-system)
- [PluginContext API Reference](#plugincontext-api-reference)
- [Runtime API Reference](#runtime-api-reference)
- [Plugin Isolation Rules](#plugin-isolation-rules)
- [Performance Rules](#performance-rules)
- [Error Handling](#error-handling)
- [Adding a Plugin](#adding-a-plugin)
- [Architecture Model](#architecture-model)

---

## Introduction

lemu's plugin system lets you extend the terminal workspace with custom commands, tab views, actions, and lifecycle hooks — without modifying core application code.

### Philosophy

- **Plugin-first** — Every feature is a plugin. The core provides infrastructure only: runtime, event bus, feedback, registries.
- **Zero coupling** — Plugins never import each other. Communication flows through the runtime interface and event bus.
- **Self-declaring** — Each plugin declares its commands, views, actions, and docs in its manifest. The core discovers these at load time.
- **No magic** — Registration is explicit. All plugins are listed in a single composition root (`src/main.tsx`). No filesystem scanning, no decorators.

### What the Core Owns

- Runtime orchestration (load, init, destroy)
- Command execution and autocomplete routing
- Event bus lifecycle
- Feedback pipeline (service + UI bar)
- Tab management and workspace rendering
- Plugin registry and plugin loader

### What Plugins Own

- Command definitions and handlers
- Tab view components
- Config actions (`>` prefix)
- Documentation strings
- Sidebar widgets (future)
- Any feature-specific state and logic

---

## Quick Start

Create a plugin in 3 steps:

```
src/plugins/my-plugin/
  index.ts        # Plugin manifest + lifecycle
  commands/       # Command handlers (optional)
  views/          # React view components (optional)
```

**Step 1:** Create `src/plugins/my-plugin/index.ts`:

```ts
import type { Plugin } from '../../core/plugin-system/types';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '0.1.0',
  description: 'Does something useful',
  async activate(ctx) {
    console.log('[MY-PLUGIN] activated');
  },
  async onCleanup() {
    console.log('[MY-PLUGIN] cleaned up');
  },
};
```

**Step 2:** Build:

```bash
npm run build
```

**Step 3:** Done. Plugins are auto-discovered at build time — no other files need changes.

---

## Plugin Lifecycle

Plugins progress through these phases in order:

```
onConfig → activate → onAppRender → onReady → [runtime:ready] → onCommandExecuted* → onCleanup → deactivate
```

### Phase Details

| Phase | Called | Purpose | Timing |
|-------|--------|---------|--------|
| `onConfig` | Before `activate` | Transform/resolve plugin config | Once, at load |
| `activate` | After config resolved | Register commands, views, actions, event listeners | Once, at load |
| `onAppRender` | After all plugins activated | Register React context wrappers around the app root | Once, after all `activate()` |
| `onReady` | After `onAppRender` | Start background work, fetch data, set up subscriptions | Once, after all `onAppRender()` |
| `onCommandExecuted` | After every command | Analytics, audit logs, cross-plugin reactions | Every command execution |
| `onCleanup` | On runtime destroy | Tear down subscriptions, workers, timers | Once, before `deactivate` |
| `deactivate` | On runtime destroy | Unregister resources | Once, after `onCleanup` |

### Performance Expectations

- `activate` must resolve within 1 second. Do not fetch data or do heavy computation here — defer to `onReady`.
- `onCleanup` must be synchronous or fast-async. Remove event listeners, clear intervals, abort fetches.
- All lifecycle methods are called with `await`. A slow `onReady` blocks the entire app from starting.
- Exceptions in any lifecycle hook are caught and logged individually. One failing plugin never blocks others.

### Execution Guarantees

- All plugins complete `activate` before any plugin receives `onAppRender`.
- All plugins complete `onAppRender` before any plugin receives `onReady`.
- The `runtime:ready` event fires after all `onReady` calls complete.
- `onCommandExecuted` runs sequentially per command — plugins execute in registration order.
- Exceptions in one lifecycle hook do not prevent other hooks from running.

---

## Folder Structure

```
plugins/my-plugin/
  index.ts            # Plugin manifest (REQUIRED)
  commands/           # Command modules (optional)
    my-command.ts
  views/              # React view components (optional)
    MyView.tsx
  types.ts            # Plugin-specific types (optional)
  config.ts           # Config defaults & validation (optional)
  utils.ts            # Helper functions (optional)
```

### Rules

- `index.ts` is required — it exports the `Plugin` object.
- Everything else is optional. A valid plugin can be a single file.
- Organize by feature, not by type. If a command is small, keep it in `index.ts`.
- Avoid deeply nested folders. Flat is better.

---

## Minimal Example

The smallest valid plugin that demonstrates every integration point:

**File: `src/plugins/minimal/index.ts`**

```ts
import type { Plugin, PluginContext } from '../../core/plugin-system/types';
import type { PluginAction } from '../../core/actions/types';

// --- Command ---
const greetCommand = {
  name: 'greet',
  description: 'Say hello',
  aliases: ['hi'],
  usage: '/greet <name>',
  async execute(args: string[]) {
    const name = args[0] || 'world';
    return { success: true, message: `Hello, ${name}!` };
  },
  async autocomplete() { return []; },
  validate(args: string[]) {
    return args.length > 1 ? 'Too many arguments' : null;
  },
};

// --- View ---
function GreetView({ state }: { state: Record<string, unknown> }) {
  const React = require('react');
  return React.createElement('div', { style: { padding: 16, color: '#0f0' } },
    React.createElement('h3', null, 'Greeting'),
    React.createElement('p', null, String(state.message || 'Hello!')),
  );
}

// --- Action (config mode: >greet) ---
const greetAction: PluginAction = {
  id: 'greet',
  title: 'Set Greeting',
  description: 'Change the greeting message',
  handler: async () => {
    return 'Greeting action executed. Type /greet to see the result.';
  },
};

// --- Plugin manifest ---
export const minimalPlugin: Plugin = {
  id: 'minimal',
  name: 'Minimal Plugin',
  version: '0.1.0',
  description: 'Demonstrates every integration point',

  // Declarative registration
  commands: [greetCommand],
  actions: [greetAction],
  views: [{
    type: 'greeting',
    component: GreetView,
    meta: { label: 'Greeting', icon: '\u2728' },
  }],
  tabTypes: ['greeting'],

  // Lifecycle hooks
  async activate(ctx: PluginContext) {
    // Commands, actions, and views declared above
    // are registered automatically by the PluginLoader.
    // Use activate() for any additional setup.
    ctx.events.on('my-plugin:custom', () => {
      console.log('[MINIMAL] custom event received');
    });
  },

  onReady() {
    console.log('[MINIMAL] plugin is ready');
  },

  onCleanup() {
    console.log('[MINIMAL] cleaned up');
  },

  // Documentation for @help and /help minimal
  docs: {
    overview: 'A minimal plugin that greets the user.',
    examples: '  /greet\n  /greet Alice\n  @greet',
    troubleshooting: '  If /greet is not found, rebuild with npm run build.',
  },
};
```

**Auto-Discovery:**

The plugin is automatically discovered at build time. No registration needed.

That's it. The plugin now has:
- A `/greet` command with alias `hi`
- A `>greet` config action (type `>greet` in the terminal when a `greeting` tab is active)
- A `greeting` tab view (commands return `{ ..., data: { type: 'greeting', message: 'Hi' } }`)
- Help documentation accessible via `/help minimal` or `@minimal`
- A cleanup hook

---

## Plugin Interface

Full TypeScript definition. Every field explained.

```ts
interface Plugin {
  /** Unique identifier. Used in logs, help lookups, and tab-type mapping. */
  id: string;

  /** Human-readable name. Shown in help and debug output. */
  name: string;

  /** Semver string. Logged but not enforced. */
  version: string;

  /** One-line description. Shown in /help listings. */
  description?: string;

  /** REQUIRED. Called after config resolution. Register commands, views,
   * actions, event listeners here. Must resolve within 1 second. */
  activate(ctx: PluginContext): Promise<void>;

  /** Called during runtime shutdown after onCleanup. */
  deactivate?(ctx: PluginContext): Promise<void>;

  /** Commands registered by this plugin. Registered automatically
   * before activate() is called. */
  commands?: Command[];

  /** Actions registered by this plugin. Registered automatically
   * before activate() is called. */
  actions?: PluginAction[];

  /** Dynamic action getter. Called lazily when autocomplete resolves
   * actions for this plugin's tab types. Overrides `actions` if set. */
  getActions?(): PluginAction[];

  /** View components registered by this plugin. Each view maps a
   * tab type string to a React component. Registered automatically
   * before activate() is called. */
  views?: PluginView[];

  /** Tab type strings this plugin owns. Used to resolve `>` actions:
   * when a tab of this type is active, the plugin's actions are shown
   * in autocomplete. */
  tabTypes?: string[];

  /** Config transformer. Receives raw config, returns resolved config.
   * Called before activate(). The resolved config is available at
   * ctx.config during activate() and beyond. */
  onConfig?(config: Record<string, unknown>): Promise<Record<string, unknown>>;

  /** Called after ALL plugins are activated and onAppRender completes.
   * Use for data fetching, subscriptions, background work. */
  onReady?(ctx: PluginContext): Promise<void>;

  /** Called after the app root DOM is mounted. Register React context
   * wrappers here (e.g., ThemeProvider, QueryClient). */
  onAppRender?(ctx: AppRenderContext): Promise<void>;

  /** Called after every command execution. Receives the command name,
   * args, result, and duration. Use for analytics, audit, or
   * cross-plugin reactions. */
  onCommandExecuted?(payload: CommandExecutedPayload): Promise<void>;

  /** Called during runtime shutdown before deactivate. Clean up timers,
   * event listeners, WebSocket connections, abort controllers. */
  onCleanup?(): Promise<void>;

  /** Documentation strings surfaced by /help and @help. */
  docs?: PluginDocs;
}
```

### PluginView

```ts
interface PluginView {
  /** Tab type string. Matches the `type` field of a Tab object.
   * Used by Workspace to look up the render component. */
  type: string;

  /** React component that renders the tab content. Receives
   * `{ state: Record<string, unknown> }` — the tab's state object. */
  component: ComponentType<{ state: Record<string, unknown> }>;

  /** Display metadata for tab headers and menus. */
  meta: {
    label: string;  // Display name (e.g., "Editor")
    icon: string;   // Single character or emoji (e.g., "\u270E")
  };
}
```

### PluginDocs

```ts
interface PluginDocs {
  overview: string;          // Required. Shown in /help <plugin-id>.
  examples?: string;         // Usage examples.
  workflows?: string;        // Common workflows.
  troubleshooting?: string;  // Common issues and fixes.
  tips?: string;             // Pro tips.
  limitations?: string;      // Known limitations.
}
```

### CommandExecutedPayload

```ts
interface CommandExecutedPayload {
  command: string;                                  // Command name
  args: string[];                                   // Arguments passed
  result: { success: boolean; message: string; data?: unknown };  // Execution result
  duration: number;  // milliseconds
}
```

### AppRenderContext

```ts
interface AppRenderContext {
  /** Register a React component that wraps the entire app tree.
   * Useful for providers (ThemeProvider, QueryClient, etc.).
   * Components receive { children: React.ReactNode } props. */
  registerWrapper(wrapper: unknown): void;
}
```

---

## Command System

Commands are slash-prefixed (`/command`). The `!` prefix is rewritten to `/run`.

### Command Interface

```ts
interface Command {
  /** Primary name. Used as /name. Must be unique across all plugins. */
  name: string;

  /** Short description shown in autocomplete and /help. */
  description: string;

  /** Alternative names. Users can type /alias to invoke the same command. */
  aliases: string[];

  /** Command handler. Receives parsed args. Returns result. */
  execute(args: string[]): Promise<CommandResult>;

  /** Return autocomplete suggestions for partial args. For example,
   * if user types "/open src/", return file suggestions under src/.
   * Return empty array if no suggestions. */
  autocomplete(args: string[]): Promise<AutocompleteItem[]>;

  /** Validation function. Return an error string if args are invalid,
   * or null if valid. Displayed as feedback before execute(). */
  validate(args: string[]): string | null;

  /** Usage hint. Shown in autocomplete and error feedback. */
  usage?: string;

  /** Example invocations. Used by /help <command>. */
  examples?: CommandExample[];

  /** Edge cases. Used by /help <command>. */
  edgeCases?: CommandEdgeCase[];
}
```

### CommandResult

```ts
interface CommandResult {
  success: boolean;    // true = command succeeded
  message: string;     // User-facing output
  data?: unknown;      // Optional structured data (e.g., { type: 'editor', path: '...' })
}
```

### AutocompleteItem

```ts
interface AutocompleteItem {
  value: string;        // The text to insert on selection
  description?: string; // Contextual description
  type?: 'file' | 'dir' | 'command' | 'arg' | 'help' | 'action';
}
```

### How Commands Work

1. User types `/command arg1 arg2` and presses Enter.
2. Input is parsed by `parse()` into `{ name: 'command', args: ['arg1', 'arg2'], raw: '...' }`.
3. Runtime dispatches to `executor.execute(parsed)`.
4. Executor looks up the command by name in the global `registry`.
5. If found: calls `validate(args)`, then `execute(args)`. Returns result.
6. If not found: returns error. Runtime derives a suggestion via fuzzy matching.
7. Result is displayed in the message area. If `data` contains `{ type }`, a new tab opens.

### Dynamic Registration

Commands can be registered at any time via `ctx.commands.register(cmd)` during `activate()`. This is the recommended approach:

```ts
async activate(ctx: PluginContext) {
  ctx.commands.register(myCommand);
}
```

Commands declared in the `commands` array are registered automatically by the PluginLoader before `activate()` is called. Both approaches are equivalent.

### Autocomplete Flow

1. User types `/` — all command names are shown with descriptions.
2. User types `/ope` — fuzzy-matched suggestions narrow down.
3. User types `/open ` (with space) — `autocomplete([''])` is called on the matched command.
4. User types `/open src/` — `autocomplete(['src/'])` returns file/dir suggestions.
5. Arrow keys navigate, Enter selects, Escape closes.

---

## Config Mode (`>`)

The `>` prefix triggers plugin-scoped action mode. Unlike commands (which are global), actions are scoped to the currently active tab's plugin.

### How It Works

1. A tab is active with type `editor`, `browser`, `search`, etc.
2. The runtime looks up which plugin owns that tab type via `tabTypes`.
3. Typing `>` triggers autocomplete showing that plugin's actions.
4. Selecting an action or typing `>action-id` executes the action handler.

### PluginAction Interface

```ts
interface PluginAction {
  /** Unique action ID within the plugin. Used as >id. */
  id: string;

  /** Display title shown in autocomplete. */
  title?: string;

  /** Description shown in autocomplete. */
  description?: string;

  /** Alternative names for matching in autocomplete. */
  aliases?: string[];

  /** Restrict to specific tab types. '*' or omitted = all types. */
  type?: string;

  /** Action handler. Receives context about the current tab.
   * Returns a user-facing message string. */
  handler: (ctx: ActionContext) => string | Promise<string>;
}
```

### ActionContext

```ts
interface ActionContext {
  tabId: string | null;
  tabType: string | null;
  tabState: Record<string, unknown>;
  pinned: boolean;
  pin: () => void;    // Pin the current tab
  unpin: () => void;  // Unpin the current tab
}
```

### Pin/Unpin Pattern

The `pin` and `unpin` actions are standard actions available on all tab types:

- `>pin` — Pins tab to sidebar (not closable, shows in sidebar)
- `>unpin` — Unpins tab from sidebar

These are registered globally in the standard actions set.

### Action Resolution

Actions are resolved at autocomplete time, not at registration time:

1. `Runtime.resolveActionsForTabType(tabType)` looks up the plugin for that `tabType`.
2. If the plugin has `getActions()`, it's called lazily (actions can change dynamically).
3. Otherwise, the static `actions` array is used.
4. `Runtime.matchAction(query, action)` does a case-insensitive match on `id`, `title`, and `aliases`.

### Config Mode Flow

```
User types: >file
├── Tab type is "editor" → owned by fs plugin
├── fs plugin's actions are loaded
├── "file" fuzzy-matched against action IDs/titles/aliases
├── "open-file" matches (id contains "file")
└── Selecting it executes open-file handler
```

---

## View System

Views are React components that render tab content. Each tab has a `type` string that maps to a view component registered by a plugin.

### How to Add a View

1. Create a React component that accepts `{ state: Record<string, unknown> }`.
2. Add it to the plugin's `views` array with a unique `type` string.
3. Add the `type` string to the plugin's `tabTypes` array.

```ts
import MyView from './views/MyView';

export const myPlugin: Plugin = {
  // ...
  views: [{
    type: 'my-view',
    component: MyView,
    meta: { label: 'My View', icon: '\u2728' },
  }],
  tabTypes: ['my-view'],
};
```

### How Tabs Open

Commands return data with a `type` field matching a registered tab type:

```ts
async execute(args: string[]) {
  return {
    success: true,
    message: 'File opened',
    data: { type: 'editor', path: '/src/index.ts' },
  };
}
```

When the runtime sees `data.type` in a successful result, it instructs the UI to open a new tab of that type.

### Tab Identity

- Each tab has a unique `id` (auto-generated, deterministic per type).
- Tabs of the same type can coexist. If two tabs have the same `id`, only one is created (deduplication).
- Tab state is passed via `data` and stored in `tab.state`. It's read-only from the plugin side.

### View Component Contract

```ts
// Your view receives:
interface ViewProps {
  state: Record<string, unknown>;
  // state contains whatever the command put in data
}

// Example:
function EditorView({ state }: ViewProps) {
  const path = state.path as string;
  const content = state.content as string;
  return <pre>{content}</pre>;
}
```

### View Isolation

- Views are rendered inside a `<div className="workspace-tab-content">` container.
- Views should NOT import other plugins or use plugin-specific globals.
- All cross-plugin communication goes through the event bus or runtime.
- Views should be pure: given the same `state`, render the same output.

---

## Help System (`@`)

The `@` prefix provides instant help lookup.

### Usage

- `@plugin-id` — Shows plugin documentation
- `@command-name` — Shows command documentation

### How Help Works

1. User types `@topic` and presses Enter.
2. App.tsx intercepts the `@` prefix and executes `/help topic`.
3. The `help` command (from the help plugin) looks up the topic:
   - First checks plugin registry for a plugin with matching `id` → shows `plugin.docs`.
   - Then checks command registry for a command with matching `name` → shows command details (examples, edge cases, usage).
4. If the result `data` contains a `type` field, a help tab opens with the content.

### Registering Help Docs

Plugins self-document via the `docs` field:

```ts
docs: {
  overview: 'What this plugin does.',
  examples: '  /command\n  /command arg',
  workflows: '  1. Step one\n  2. Step two',
  troubleshooting: '  Common problem — solution.',
  tips: '  Pro tip here.',
  limitations: '  Known limitation.',
}
```

### Dynamic Help

- `/help` lists all registered commands and plugins.
- `/help <id>` shows docs for that plugin or command.
- Help content is generated dynamically — never hardcoded.

---

## Event System

The event bus provides pub/sub communication between plugins and between plugins and core.

```ts
interface EventBus {
  /** Emit an event. Any listener can pick it up. */
  emit(event: string, payload?: unknown): void;

  /** Subscribe to an event. Returns an unsubscribe function.
   * Always call the unsubscribe in onCleanup(). */
  on(event: string, handler: (payload?: unknown) => void): () => void;
}
```

### Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `plugin:id:action` | `plugin:fs:file-opened` | Plugin-specific events |
| `runtime:*` | `runtime:ready` | Core lifecycle events |
| `plugin:*` | `plugin:activated` | Plugin lifecycle events |

### Built-in Events

| Event | Payload | Fires |
|-------|---------|-------|
| `runtime:ready` | `{}` | After all plugins initialized |
| `plugin:activated` | `{ id, name }` | Each plugin after activation |
| `command:executed` | `CommandExecutedPayload` | After every command |
| `feedback` | `FeedbackEvent` | When feedback is shown |

### Best Practices

```ts
// In activate():
const unsub = ctx.events.on('some:event', handler);

// In onCleanup():
unsub();  // Always clean up listeners
```

- Always store and call the unsubscribe function.
- Use event namespacing: `your-plugin-id:event-name`.
- Events are synchronous. Long handlers block the bus.
- Do not emit events during `activate()` — listeners from other plugins may not be ready yet.

---

## Feedback System

The feedback system provides user-facing messages (error, warning, info, success) through a unified bar above the input.

### PluginContext.feedback API

```ts
ctx.feedback.error(message, meta?);
ctx.feedback.warning(message, meta?);
ctx.feedback.info(message, meta?);
ctx.feedback.success(message, meta?);

// meta is optional:
interface FeedbackMeta {
  suggestion?: string;  // "Did you mean ...?"
  command?: string;     // Related command name
}
```

### How Feedback Flows

1. Plugin calls `ctx.feedback.error('File not found', { suggestion: '/open --help' })`.
2. The runtime emits a `feedback` event on the event bus.
3. The `FeedbackService` receives the event and stores it as current feedback.
4. The `FeedbackBar` component subscribes to the service and renders.
5. User dismisses by pressing Escape or clicking the dismiss button.

### Feedback Levels

| Level | Use Case | Visual |
|-------|----------|--------|
| `error` | Command failures, unexpected errors | Red |
| `warning` | Non-blocking issues | Yellow |
| `info` | General information | Blue |
| `success` | Operation completed | Green |

### Rules

- Call feedback methods from lifecycle hooks and command handlers.
- Do NOT create custom feedback UI in plugins. Always use the global bar.
- Suggestions are rendered as clickable text in the feedback bar.

---

## PluginContext API Reference

The `PluginContext` object is passed to `activate()` and `onReady()`. It provides access to all core services.

| Property | Type | Description |
|----------|------|-------------|
| `commands` | `CommandRegistry` | Register, look up, and enumerate commands |
| `events` | `EventBus` | Pub/sub event system |
| `shell` | `ShellService` | PTY shell session management (stubs in browser) |
| `workspace` | `WorkspaceService` | Message area access (add, update, list messages) |
| `storage` | `StorageService` | Key-value in-memory storage |
| `ui` | `UIService` | Panel and app wrapper registration |
| `config` | `Record<string, unknown>` | Resolved plugin configuration |
| `actions` | `{ register }` | Register plugin actions for `>` mode |
| `views` | `{ register }` | Register view components for tab types |
| `feedback` | `{ error, warning, info, success }` | User-facing message API |

### CommandRegistry

```ts
interface CommandRegistry {
  register(cmd: Command): void;                              // Add a command
  get(name: string): Command | undefined;                    // Look up by name
  findByAlias(alias: string): Command | undefined;           // Look up by alias
  getAll(): Command[];                                       // List all commands
}
```

### EventBus

```ts
interface EventBus {
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload?: unknown) => void): () => void;
}
```

### ShellService

```ts
interface ShellService {
  sendInput(input: string, sessionId?: string): void;
  createSession(): void;
  destroySession(id: string): void;
  switchSession(id: string): void;
  listSessions(): Array<{ id: string; cwd: string; shellType: string }>;
}
```

**Note:** In the browser context, shell operations are stubs. Real PTY sessions are created on the server via WebSocket.

### WorkspaceService

```ts
interface WorkspaceService {
  addMessage(type: 'user' | 'system' | 'error', content: string, data?: unknown): string;  // Returns message ID
  updateMessage(id: string, updates: Record<string, unknown>): void;
  getMessages(): Array<{ id: string; type: string; content: string }>;
}
```

### StorageService

```ts
interface StorageService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}
```

**Note:** In-memory only. Data is lost on page reload.

### UIService

```ts
interface UIService {
  showPanel(id: string, component: unknown): void;
  hidePanel(id: string): void;
  registerAppWrapper(wrapper: unknown): void;
}
```

`registerAppWrapper` registers React context providers that wrap the entire app tree. Use during `onAppRender`:

```ts
async onAppRender(ctx: AppRenderContext) {
  ctx.registerWrapper(MyProvider);
}
```

### actions.register

```ts
ctx.actions.register(type: string, action: PluginAction): void;
```

Registers a config action. `type` is the tab type restriction (`'*'` for all).

### views.register

```ts
ctx.views.register(
  type: string,
  component: ComponentType<{ state: Record<string, unknown> }>,
  meta: { label: string; icon: string }
): void;
```

Registers a view component for a tab type.

### feedback

```ts
// All return void. Meta is optional.
ctx.feedback.error(message: string, meta?: { suggestion?: string; command?: string });
ctx.feedback.warning(message: string, meta?: { suggestion?: string; command?: string });
ctx.feedback.info(message: string, meta?: { suggestion?: string; command?: string });
ctx.feedback.success(message: string, meta?: { suggestion?: string; command?: string });
```

---

## Runtime API Reference

The `Runtime` object is the top-level application interface. It's accessible from `getRuntime()`.

```ts
interface Runtime {
  pluginRegistry: PluginRegistry;
  pluginLoader: PluginLoader;
  pluginContext: PluginContext;
  actionRegistry: ActionRegistry;
  feedback: FeedbackService;
  viewComponentMap: Record<string, ComponentType<{ state: Record<string, unknown> }>>;
  viewMetaMap: Record<string, { label: string; icon: string }>;
  execute(parsed: ParsedCommand): Promise<CommandResult>;
  getAutocomplete(parsed: ParsedCommand): Promise<AutocompleteItem[]>;
  init(plugins: Plugin[]): Promise<void>;
  destroy(): Promise<void>;
  resolveActionsForTabType(tabType: string | null): PluginAction[] | null;
  matchAction(query: string, action: PluginAction): boolean;
}
```

### getRuntime()

```ts
import { getRuntime } from './core/runtime/instance';

const runtime = getRuntime();
```

Available after `setRuntime()` is called during bootstrap. Throws if accessed before initialization.

### PluginRegistry

```ts
class PluginRegistry {
  register(plugin: Plugin): void;
  get(id: string): Plugin | undefined;
  getActive(): Plugin[];
  activate(id: string): void;
  deactivate(id: string): void;
  getPluginByTabType(tabType: string): Plugin | undefined;
}
```

### FeedbackService

```ts
class FeedbackService {
  show(event: FeedbackEvent): void;
  clear(): void;
  subscribe(callback: (event: FeedbackEvent | null) => void): () => void;
  get currentFeedback(): FeedbackEvent | null;
}
```

---

## Plugin Isolation Rules

These rules are mandatory. Violations will be caught in code review.

### Rule 1: No Direct Plugin Imports

```ts
// ❌ WRONG — Don't import other plugins directly
import { fsPlugin } from '../fs';
import { searchPlugin } from '../search';

// ✅ CORRECT — Use the event bus or runtime
const runtime = getRuntime();
const cmd = runtime.pluginRegistry.get('fs');  // OK for reflection
ctx.events.emit('my-plugin:request', data);
```

### Rule 2: No Global UI Mutation

```ts
// ❌ WRONG — Don't manipulate DOM directly
document.querySelector('.sidebar').appendChild(el);

// ❌ WRONG — Don't use React context from other plugins
import { SomeContext } from '../../plugins/other/context';

// ✅ CORRECT — Use the provided APIs
ctx.ui.showPanel('my-panel', MyComponent);
ctx.feedback.info('Operation complete');
```

### Rule 3: No Hardcoded UI Assumptions

```ts
// ❌ WRONG — Don't assume specific CSS classes or DOM structure
<div className="workspace-sidebar-left">...</div>

// ✅ CORRECT — Let the core handle layout
// Your view component just renders its content
```

### Rule 4: No Hardcoded Tab Types from Other Plugins

```ts
// ❌ WRONG — Don't reference other plugins' tab types
if (tabType === 'editor') { /* assumes fs plugin */ }

// ✅ CORRECT — Use generic runtime lookups
const plugin = runtime.pluginRegistry.getPluginByTabType(tabType);
```

### Rule 5: Self-Contained State

- Keep state inside your plugin.
- Use `ctx.storage` for cross-session data within a page lifetime.
- Do not pollute `window` or global scope.

### Rule 6: Clean Up After Yourself

- Every `ctx.events.on()` must have a corresponding `unsubscribe()` in `onCleanup()`.
- Every `setInterval`/`setTimeout` must be cleared in `onCleanup()`.
- Every `AbortController` must be aborted in `onCleanup()`.

---

## Performance Rules

### Lazy Rendering

- View components are only rendered when their tab is active.
- Heavy computation should be deferred with `useEffect` or lazy imports.
- Use `React.memo` on view components if they receive stable state.

### Cleanup Responsibilities

```ts
onCleanup() {
  this.abortController?.abort();
  this.unsub?.();
  clearInterval(this.timer);
}
```

### Avoid Global Re-renders

- Do not subscribe to global events that fire frequently unless necessary.
- Use the returned unsubscribe function to detach when your plugin is inactive.
- Prefer `ctx.events.on()` over polling or timers.

### Autocomplete Performance

- `autocomplete()` should resolve in under 50ms.
- Cache results if the underlying data hasn't changed.
- Return empty array if you have no suggestions.

---

## Error Handling

### Command Failures

Commands should return `{ success: false, message: '...' }` for expected failures. The runtime will automatically show feedback with a suggestion if available.

```ts
async execute(args: string[]) {
  if (!args[0]) {
    return { success: false, message: 'Please specify a path' };
  }
  try {
    // ...
    return { success: true, message: 'Done' };
  } catch (err) {
    return { success: false, message: `Error: ${err.message}` };
  }
}
```

### UI Failures

If a view component throws during render, the error boundary in Workspace catches it and shows "No content for this tab type." Always wrap plugin views in try/catch for async initialization.

```ts
function MyView({ state }: ViewProps) {
  const [error, setError] = useState<string | null>(null);
  // ...handle errors gracefully
  if (error) return <div className="error">{error}</div>;
  return <div>...</div>;
}
```

### Plugin Crash Isolation

- A crash in one plugin's lifecycle hook does not affect other plugins.
- A crash in one command handler does not affect other commands.
- A crash in a view component is caught by React error boundaries.
- All lifecycle errors are logged to console but never crash the runtime.

### User-Facing Error Reporting

- Use `ctx.feedback.error()` for user-facing errors.
- The runtime automatically shows feedback for command failures.
- Do not create custom error modals or toasts.

---

## Adding a Plugin

Exact steps to add a new plugin:

### Step 1: Create the Plugin Folder

```
src/plugins/my-plugin/
  index.ts
```

### Step 2: Export the Plugin Manifest

```ts
// src/plugins/my-plugin/index.ts
import type { Plugin } from '../../core/plugin-system/types';

export const myPlugin: Plugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '0.1.0',
  async activate(ctx) {
    // ...
  },
};
```

### Step 3: Build

```bash
npm run build
```

### Auto-Discovery

Plugins are automatically discovered at bundle time by Vite's `import.meta.glob`. The discovery function (`src/core/plugin-system/plugin-discovery.ts`) scans all `src/plugins/*/index.ts` files, duck-types each export for the `Plugin` shape (`id`, `name`, `version`, `activate`), and registers valid exports.

This means:
- No manual `import` statements needed
- No `main.tsx` edits required
- No registry configuration needed

### Files That Must Be Modified

| File | Change |
|------|--------|
| New file under `src/plugins/` | Create the plugin |

**No other files need to be modified.** This is the only integration point.

---

## Architecture Model

### Why Plugin-Based?

The entire application is built as a composition of plugins. The core provides:

- Runtime orchestration (load, init, destroy)
- Command execution pipeline
- Event bus
- Feedback pipeline
- Tab management UI
- Plugin registry

Everything else — commands, views, actions, help — comes from plugins.

### What Remains in Core

- `App.tsx` — Top-level UI shell. Hardcodes `/terminal` routing (PTY requirement).
- `Workspace.tsx` — Tab content renderer. Reads `viewComponentMap` from runtime.
- `Sidebar.tsx` — Tab list with pin/unpin. Plugin-agnostic.
- `InputBar.tsx` — Command input with autocomplete. Plugin-agnostic.
- `FeedbackBar.tsx` — Global feedback display. Plugin-agnostic.
- `runtime/index.ts` — Runtime factory. Creates context, wires services.
- `plugin-system/` — Plugin, PluginRegistry, PluginLoader.

### Remaining Architectural Limitations

1. **`/terminal` is hardcoded in App.tsx** — The PTY terminal command cannot be a plugin because it requires special UI handling (TerminalTabBar, WebSocket session). This is a core concern.

2. **View components are colocated with old views directory** — Individual `.tsx` view components (`EditorView`, `BrowserView`, etc.) are still in `src/views/`. They are imported by their respective plugins. This is not a coupling issue but a naming artifact.

### Design Principles Summary

| Principle | What It Means |
|-----------|---------------|
| Auto-discovery | Plugins are discovered at build time via `import.meta.glob` — no manual registration |
| Self-declaring | Plugins declare commands, views, actions in their manifest |
| Zero direct imports | Plugins never import each other |
| Runtime-driven | All cross-plugin communication through event bus or runtime |
| Global feedback | One feedback bar, one pipeline. No plugin-specific UI. |
| Lazy resolution | Actions resolved at autocomplete time, not registration time |
