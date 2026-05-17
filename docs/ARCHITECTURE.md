# lemu — Architecture Guide

> Internal architecture, plugin ownership, runtime flow, and data lifecycle.

---

## 1. System Overview

lemu is a client-server application with a plugin-based command architecture.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React SPA)                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  App.tsx                                            │ │
│  │  ├── State: messages, tabs, input, panel visibility │ │
│  │  ├── Handlers: submit, keydown, terminal commands   │ │
│  │  └── Layout: Sidebar + Main (TabBar + Workspace)    │ │
│  │                                                      │ │
│  │  Hooks: useTerminal(), useAutocomplete(),            │ │
│  │         useCommandHistory()                          │ │
│  │                                                      │ │
│  │  Core: runtime, parser, executor, events, history    │ │
│  │  Plugins: 7 plugins with 11 commands                 │ │
│  └─────────────────────────────────────────────────────┘ │
│                          ↕ HTTP REST + WebSocket          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Server (Express + WebSocket)                       │ │
│  │  ├── HTTP: /api/fs/*, /api/shell/exec, /api/ws     │ │
│  │  ├── WebSocket: PTY I/O, session management         │ │
│  │  └── PTY Manager: ShellSession (node-pty)           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Plugin Architecture

### Plugin Ownership Map

| Plugin ID | Name | Commands | Lifecycle Hooks Used |
|-----------|------|----------|---------------------|
| `fs` | Filesystem | `open`, `copy`, `move`, `delete` | `activate`, `onCommandExecuted` |
| `search` | Code Search | `search` | `activate` |
| `git` | Git Integration | `git` | `activate` |
| `task` | Task Manager | `task` | `activate`, `onConfig`, `onReady`, `onCleanup` |
| `exec` | Command Execution | `run` | `activate` |
| `browser` | Browser Preview | `browser` | `activate` |
| `ai` | AI Integration | `ai`, `agent` | `activate` |

### Plugin Interface

```typescript
interface Plugin {
  id: string;                    // Unique plugin identifier
  name: string;                  // Human-readable name
  version: string;               // Semver
  description?: string;          // Brief description
  commands?: Command[];          // Commands this plugin registers
  activate(ctx: PluginContext): Promise<void>;
  deactivate?(ctx: PluginContext): Promise<void>;
  onConfig?(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  onReady?(ctx: PluginContext): Promise<void>;
  onCommandExecuted?(payload: CommandExecutedPayload): Promise<void>;
  onAppRender?(ctx: AppRenderContext): Promise<void>;
  onCleanup?(): Promise<void>;
}
```

### Plugin Context

Every plugin receives a `PluginContext` with services:

```typescript
interface PluginContext {
  shell: ShellService;           // Terminal session management
  workspace: WorkspaceService;   // Message stream operations
  events: EventBus;              // Publish/subscribe events
  commands: CommandRegistry;     // Command registration/lookup
  storage: StorageService;       // Key-value store (in-memory)
  ui: UIService;                 // App wrapper registration
  config: Record<string, unknown>;  // Plugin configuration
}
```

### Plugin Loading Sequence

```
main.tsx:bootstrap()
  │
  ├── createRuntime()
  │     ├── new PluginRegistry()        ← tracks registered/active plugins
  │     ├── createPluginContext()       ← creates shell, workspace, events, etc.
  │     └── new PluginLoader(registry, ctx)
  │
  ├── setRuntime(runtime)
  │
  ├── runtime.init([fsPlugin, searchPlugin, ...])
  │     └── pluginLoader.loadAll(plugins)
  │           └── for each plugin:
  │                 ├── registry.register(plugin)      ← add to plugin map
  │                 ├── plugin.onConfig(config)         ← optional config hook
  │                 ├── register commands              ← ctx.commands.register(cmd)
  │                 ├── plugin.activate(ctx)            ← plugin activation
  │                 └── registry.activate(id)           ← mark as active
  │
  ├── onAppRender (per active plugin)   ← optional render hook
  ├── onReady (per active plugin)       ← optional ready hook
  └── renderApp()                       ← mounts React app
```

---

## 3. Command Execution Pipeline

### Flow Diagram

```
User Input
    │
    ▼
Parser.parse(input)
    │
    ├── starts with "/"     → SlashCommand → { name, args, raw }
    ├── starts with "!"     → RunCommand   → { name: "run", args: [rest] }
    └── neither             → ShellCommand → direct to WebSocket
                                      │
                                      ▼
                              useTerminal.ensureSession()
                              terminal.sendInput(input)

SlashCommand
    │
    ▼
App.tsx handleSubmit()
    │
    ├── if name is "terminal" → handleTerminalCommand()  (built-in, no plugin)
    ├── if name is "open" → runtime.execute() + create editor tab
    └── else → runtime.execute(parsed)
                    │
                    ▼
          Runtime.execute()
              │
              ├── executor.execute(parsed)
              │     │
              │     ├── registry.get(name) or registry.findByAlias(alias)
              │     ├── cmd.validate(args)           ← validation check
              │     └── cmd.execute(args)             ← actual command logic
              │
              ├── eventBus.emit("command:executed", payload)
              │
              └── for each active plugin:
                    └── plugin.onCommandExecuted(payload)  ← lifecycle hook
```

### Executor Details

```
Executor.execute(parsed):
  1. Lookup command by name: registry.get(name)
  2. If not found: lookup by alias: registry.findByAlias(alias)
  3. If still not found: return { success: false, message: "Unknown command" }
  4. Run cmd.validate(args)
     - If returns string (error): return { success: false, message: error }
  5. Run cmd.execute(args):
     - Wrapped in try/catch
     - Returns CommandResult { success, message, data? }

Executor.getAutocomplete(parsed):
  1. Lookup command by name or alias
  2. If found: return cmd.autocomplete(args)
  3. If not found: return all registered commands as suggestions
```

---

## 4. Event Lifecycle

### Event Bus Channels

| Event Name | Emitter | Listeners | Payload |
|-----------|---------|-----------|---------|
| `command:executed` | Runtime.execute() | Active plugins (onCommandExecuted) | `{ command, args, result, duration }` |
| `plugin:activated` | PluginLoader.load() | — | `{ id, name }` |
| `plugin:deactivated` | PluginLoader.unload() | — | `{ id }` |
| `runtime:ready` | Runtime.init() | — | `{}` |
| `task:ready` | task plugin onReady | — | `{ status: 'ready' }` |

### Event Bus Implementation

```typescript
class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: EventHandler): () => void;  // returns unsubscribe
}
```

- Singleton: `eventBus` in `src/core/events/event-bus.ts`
- Handler errors are isolated (try/catch per handler)
- `on()` returns an unsubscribe function

---

## 5. Tab Lifecycle

### Tab Data Model

```typescript
type TabType = 'editor' | 'terminal' | 'preview' | 'task' | 'ai';

interface Tab {
  id: string;                          // auto-generated: "editor-1", "editor-2", etc.
  type: TabType;                       // tab category
  title: string;                       // display label
  icon: string;                        // unicode icon character
  closable: boolean;                   // can user close this tab?
  path?: string;                       // file path (for editor tabs)
  sessionId?: string;                  // terminal session ID (for terminal tabs)
  state?: Record<string, unknown>;     // arbitrary content state
}
```

### Tab Flow

```
Creation:
  User types /open <path>
    → runtime.execute() returns { data: { path, content, type: 'file' } }
    → App.tsx detects 'path' in result.data
    → addTab('editor', path, path, result.data)
        → creates Tab object with auto-generated ID
        → appends to tabs[]
        → sets activeTabId to new tab's ID
        → MainTabBar re-renders with new tab
        → Workspace re-renders with editor content

Activation:
  User clicks tab in MainTabBar
    → selectTab(id)
    → sets activeTabId
    → Workspace re-renders with that tab's content

Closure:
  User clicks × on tab
    → closeTab(id)
    → removes from tabs[]
    → if activeTabId === id:
        → if remaining tabs > 0:
            → sets activeTabId to adjacent tab
        → else:
            → sets activeTabId to null (shows welcome/messages)

Rendering Priority:
  Workspace content = 
    if activeTab && activeTab.type === 'editor' && activeTab.state
      → render editor content (file preview)
    else if messages.length > 0
      → render message stream
    else
      → render welcome screen
```

### Note on Other Tab Types

The `TabType` enum includes `preview`, `task`, and `ai` types, but no commands currently create tabs of these types. They are defined for future use:
- `preview` tabs could show persistent browser previews
- `task` tabs could show task detail views
- `ai` tabs could show AI conversation history

---

## 6. Terminal Panel Lifecycle

### States

- **Hidden**: No terminal sessions exist (panel not rendered)
- **Collapsed**: Session exists but panel minimized (only header visible)
- **Open**: Session exists and panel expanded (xterm.js visible)

### Transitions

```
Hidden ──shell command or /terminal new──▶ Open
Hidden ────────/terminal new────────────▶ Open
Open ──────────toggle button────────────▶ Collapsed
Collapsed ─────toggle button────────────▶ Open
Open ────────close last session────────▶ Hidden
Collapsed ───close last session────────▶ Hidden
```

### Session Lifecycle

```
Client                          Server
  │                               │
  │── create-session ────────────>│
  │                               │── spawn shell (node-pty)
  │<── session-created ──────────│
  │    { sessionId, state }      │
  │                               │
  │── input: "ls\r" ────────────>│
  │                               │── pty.write("ls\r")
  │                               │<── pty.onData("file1\nfile2\n...")
  │<── output: "file1\nfile2..." │
  │                               │
  │── resize: {cols, rows} ─────>│
  │                               │── pty.resize(cols, rows)
  │                               │
  │── destroy-session ──────────>│
  │                               │── pty.kill()
  │<── session-destroyed ────────│
```

### Lazy Session Creation

```
Shell command entered (no / prefix)
  → useTerminal.ensureSession()
      → if sessionId already exists: resolve immediately
      → else: send create-session message, wait for response (promise)
      → timeout after 10 seconds
  → if session created: auto-open terminal panel
  → send input to the session
```

---

## 7. Input Routing Decision Tree

```
Input.trim()
    │
    ├── Empty → ignore
    │
    ├── Starts with "/"
    │     │
    │     ├── "/terminal" → handleTerminalCommand()  [built-in]
    │     │
    │     ├── "/open" or "/edit"
    │     │     ├── runtime.execute(parsed)
    │     │     ├── addMessage(result)
    │     │     └── if result.data.path → addTab('editor', ...)
    │     │
    │     └── else
    │           ├── runtime.execute(parsed)
    │           │     ├── executor.execute(parsed)
    │           │     │     ├── registry → validate → execute
    │           │     │     └── CommandResult returned
    │           │     └── eventBus.emit + plugin hooks
    │           └── addMessage(result)
    │
    ├── Starts with "!"
    │     └── parse as "/run <rest>" → same as /run
    │
    └── Plain text (shell command)
          └── handleShellCommand()
                ├── terminal.ensureSession()  (lazy create)
                ├── setTerminalPanelOpen(true)
                ├── create terminal message in workspace
                └── terminal.sendInput(input)
```

---

## 8. Server API Endpoints

| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/fs/list` | GET | List directory entries | `open`, `copy`, `move`, `delete` autocomplete |
| `/api/fs/read` | GET | Read file content | `open`, `browser` commands |
| `/api/fs/copy` | POST | Copy file/directory | `/copy` command |
| `/api/fs/move` | POST | Move/rename file/directory | `/move` command |
| `/api/fs/delete` | POST | Delete file/directory | `/delete` command |
| `/api/fs/search` | GET | Search file contents | `/search` command |
| `/api/fs/tree` | GET | Recursive file tree | AI `get_file_tree` tool |
| `/api/shell/exec` | POST | Execute shell command (blocking) | `/run`, `/git` commands, AI `run_command` tool |
| `/api/workspace` | GET | Workspace info | AI `get_workspace_info` tool |
| `/preview/*` | GET | Static file serving | Browser access to files |
| `/ws` | WebSocket | PTY I/O + session management | `useTerminal` hook |

### WebSocket Message Protocol

**Client → Server:**

| Type | Payload | Purpose |
|------|---------|---------|
| `input` | `{ sessionId?, data }` | Send input to PTY |
| `resize` | `{ sessionId?, cols, rows }` | Resize PTY terminal |
| `create-session` | `{}` | Create new PTY session |
| `destroy-session` | `{ sessionId }` | Kill a PTY session |
| `list-sessions` | `{}` | List all sessions |
| `switch-session` | `{ sessionId }` | Set active session |

**Server → Client:**

| Type | Payload | Purpose |
|------|---------|---------|
| `output` | `{ sessionId, data }` | PTY output data |
| `session-created` | `{ sessionId, state }` | Session created |
| `session-destroyed` | `{ sessionId }` | Session destroyed |
| `session-list` | `{ sessions }` | All current sessions |
| `session-switched` | `{ sessionId }` | Active session changed |

---

## 9. Code-Splitting

The AI module (`src/core/ai/`) is **code-split** from the main bundle:

- Dynamic `import()` in `ai-cmd.ts` and `agent-cmd.ts`:
  ```typescript
  const { askAI } = await import('../../core/ai');
  const { runAgent } = await import('../../core/ai');
  const { configureAI } = await import('../../core/ai');
  ```
- AI dependencies (OpenAI client, etc.) are NOT loaded on initial page load
- First `/ai` or `/agent` command triggers the import
- This reduces initial bundle size

---

## 10. Directory Structure

```
lemu/
├── server/                          # Backend
│   ├── index.ts                     # Express app, REST API endpoints
│   ├── ws.ts                        # WebSocket server for PTY I/O
│   └── pty/
│       ├── pty-manager.ts           # Session management (create/destroy/switch)
│       └── shell-session.ts         # node-pty wrapper per session
│
├── src/                             # Frontend
│   ├── main.tsx                     # Entry: create runtime, init plugins, render
│   ├── App.tsx                      # Root: state, layout, input handling
│   │
│   ├── core/
│   │   ├── commands/                # Command interfaces + registry
│   │   │   ├── types.ts             # Command, CommandResult, AutocompleteItem
│   │   │   ├── registry.ts          # CommandRegistry (Map<name, Command>)
│   │   │   └── index.ts             # Re-exports
│   │   │
│   │   ├── parser/index.ts          # Input classification + parsing
│   │   ├── executor/index.ts        # Command lookup, validation, execution
│   │   ├── runtime/
│   │   │   ├── index.ts             # Runtime: init, execute, lifecycle
│   │   │   └── instance.ts          # Singleton accessor (getRuntime/setRuntime)
│   │   │
│   │   ├── plugin-system/
│   │   │   ├── types.ts             # Plugin, PluginContext, lifecycle interfaces
│   │   │   ├── plugin-loader.ts     # PluginRegistry + PluginLoader
│   │   │   └── index.ts             # Re-exports
│   │   │
│   │   ├── events/event-bus.ts      # Publish/subscribe event system
│   │   ├── autocomplete/index.ts    # Fuzzy matching + scoring
│   │   ├── history/command-history.ts  # Input history (200 entries)
│   │   ├── tabs/types.ts            # Tab data model
│   │   ├── terminal/                # ANSI parser, shell history, renderer
│   │   └── ai/                      # Code-split! AI provider, agent, MCP tools
│   │
│   ├── plugins/                     # Feature plugins (7 total)
│   │   ├── fs/                      # open, copy, move, delete
│   │   ├── search/                  # search
│   │   ├── git/                     # git
│   │   ├── task/                    # task
│   │   ├── exec/                    # run
│   │   ├── browser/                 # browser
│   │   └── ai/                      # ai, agent
│   │
│   ├── hooks/                       # React hooks
│   │   ├── useTerminal.ts           # WebSocket + PTY sessions
│   │   ├── useAutocomplete.ts       # Command autocomplete
│   │   └── useCommandHistory.ts     # History navigation
│   │
│   ├── components/                  # React components
│   │   ├── Workspace.tsx            # Home / editor / message stream
│   │   ├── MainTabBar.tsx           # Editor/preview/task/ai tab bar
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── InputBar.tsx             # Input field + command menu
│   │   ├── TerminalTabBar.tsx       # Terminal session tabs
│   │   ├── TerminalOutput.tsx       # xterm.js interactive terminal
│   │   └── TerminalBlock.tsx        # Collapsible ANSI output block
│   │
│   └── styles/
│       ├── global.css               # Reset, variables, scrollbars
│       └── app.css                  # Component styles
│
└── docs/                            # Documentation
    ├── COMMANDS.md                  # Full command reference
    ├── WORKFLOWS.md                 # Real-world workflows
    ├── TESTING.md                   # QA test scenarios
    ├── ARCHITECTURE.md              # This document
    └── GETTING_STARTED.md           # 5-minute quick start
```

---

## 11. Security Model

### Path Traversal Prevention

All filesystem endpoints resolve paths relative to `WORKSPACE` and verify the result starts with `WORKSPACE`:

```typescript
const target = path.resolve(WORKSPACE, userPath);
if (!target.startsWith(WORKSPACE)) {
  return res.json({ success: false, error: 'Path outside workspace' });
}
```

This prevents: `/open ../../etc/passwd`, `/delete -f ../../sensitive-file`

### Scope

- No authentication (dev-only application)
- No rate limiting
- No input sanitization beyond path validation
- shell exec API can run arbitrary commands within the workspace

---

## 12. Known Limitations

### Functional
- Editor tabs are read-only (no in-app editing)
- Tasks are in-memory only (lost on refresh)
- No tab persistence across sessions
- No file watching (tabs don't auto-refresh)
- AI module requires external API key

### Performance
- Messages array grows unbounded
- Search walks filesystem on each query (no index)
- `/run` and `/git` use blocking `execSync`
- Large file opens may lag rendering

### Platform
- PTY uses `powershell.exe` on Windows (no cmd.exe option)
- Search only indexes specific file extensions
- Terminal panel has fixed max-height (50%)

### UX
- No keyboard shortcut for terminal panel toggle
- Output from `/git` and `/run` is all-at-once, not streamed
- No confirmation dialog for delete (relies on `-f` flag)
