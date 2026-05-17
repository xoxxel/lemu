# lemu — Terminal Workspace Architecture Report

## 1. Product Overview

**lemu** is a command-driven terminal workspace environment. It is not a traditional terminal emulator, not a web chat app, and not an IDE. It is a hybrid: a persistent shell environment wrapped in a structured workspace UI, controlled entirely through keyboard-driven slash commands and native shell input.

### Product Vision

> "This application IS my terminal."

The user should be able to execute all terminal commands, run interactive applications, manage projects, use git, run npm/pnpm/python/docker, and stay inside this workspace permanently — without ever opening another terminal app.

### Primary Workflow

1. Type a command in the input bar
2. If it starts with `/` → handled by the internal command system
3. If it doesn't start with `/` → forwarded to the persistent PTY shell session
4. Output streams live into the workspace as structured event blocks
5. History, autocomplete, and keyboard navigation provide a shell-grade UX

### UX Philosophy

- Keyboard-first: almost never need the mouse
- Command-driven: no heavy shortcut systems, no complex menus
- Terminal-native: feels like a real shell, not a web form
- Event-streamed: every action creates a visible, structured message

---

## 2. Core Features

| Feature | Description | Modules | Status |
|---------|-------------|---------|--------|
| **Slash Command System** | Modular `/command` system with registry, routing, validation, autocomplete | `core/commands/`, `core/parser/`, `core/executor/` | Complete |
| **PTY Terminal Integration** | Real shell processes via `node-pty` with persistent sessions | `server/pty/`, `server/ws.ts` | Complete |
| **Shell Execution** | Any shell command runs in a persistent PTY session | `server/pty/shell-session.ts`, `src/hooks/useTerminal.ts` | Complete |
| **Filesystem Operations** | Open, copy, move, delete, search files | `core/commands/open.ts`, `copy.ts`, `move.ts`, `delete.ts`, `search.ts` | Complete |
| **Command Routing** | `/` → internal commands, plain input → PTY shell | `core/parser/index.ts`, `App.tsx` | Complete |
| **Event/Message Stream** | Workspace displays a scrollable conversation-style event log | `components/Workspace.tsx`, `App.tsx` | Complete |
| **Live Output Streaming** | Shell output streams in real-time via WebSocket | `server/ws.ts`, `hooks/useTerminal.ts`, `components/TerminalBlock.tsx` | Complete |
| **ANSI Rendering** | Colors, bold, italic from ANSI escape codes in output blocks | `core/terminal/ansi-parser.ts`, `components/TerminalBlock.tsx` | Complete |
| **Interactive Shell** | xterm.js terminal for vim, python, ssh, etc. | `components/TerminalOutput.tsx` | Complete |
| **Autocomplete** | Fuzzy-matched suggestions for commands and arguments | `core/autocomplete/index.ts`, `hooks/useAutocomplete.ts` | Complete |
| **Fuzzy Search** | Command name fuzzy matching with scored results | `core/autocomplete/index.ts` | Complete |
| **History Navigation** | ArrowUp/ArrowDown through combined slash + shell history | `core/history/command-history.ts`, `hooks/useCommandHistory.ts` | Complete |
| **Sidebar** | Terminal sessions, processes, open files, recent files, tasks | `components/Sidebar.tsx` | Complete |
| **Terminal Tabs** | Multiple persistent shell sessions with tab switching | `components/TerminalTabBar.tsx`, `server/pty/pty-manager.ts` | Complete |
| **Split Terminals** | Recursive split pane layout (horizontal/vertical) | `components/SplitPane.tsx` | Complete |
| **Background Processes** | Process list with auto-refresh per session | `components/ProcessMonitor.tsx`, `server/ws.ts` | Complete |
| **AI Integration** | `/ai` command with tool-using AI, OpenAI-compatible API | `core/ai/`, `core/commands/ai-cmd.ts` | Complete |
| **Autonomous Agent** | `/agent` command with multi-step tool-use loop | `core/ai/agent.ts`, `core/commands/agent-cmd.ts` | Complete |
| **MCP Tools** | 6 Model Context Protocol tools for AI workspace interaction | `core/ai/mcp-tools.ts` | Complete |
| **Browser Preview** | `/browser` renders HTML files as iframes in workspace | `core/commands/browser.ts`, `components/Workspace.tsx` | Complete |
| **Task Management** | `/task` for todo list management | `core/commands/task.ts` | Complete |
| **Git Integration** | `/git` for git command execution | `core/commands/git.ts` | Complete |
| **Keyboard-First UX** | Slash menu selection, history nav, autocomplete with Enter/Tab/Escape | `App.tsx`, `hooks/useCommandHistory.ts`, `hooks/useAutocomplete.ts` | Complete |

---

## 3. UI / UX Architecture

### Workspace Layout

```
┌──────────────────────────────────────────────┐
│ Sidebar              │ Main Area              │
│ ───────────────────  │ ─────────────────────  │
│ lemu                 │ [Terminal Tab Bar]     │
│ > cwd                │ ─────────────────────  │
│ ──────────           │                        │
│ Terminals [+]        │   Workspace            │
│   ● terminal         │   (Split Panes or      │
│ ──────────           │    Message Stream)     │
│ Processes (2)        │                        │
│   ● npm 1234         │                        │
│ ──────────           │                        │
│ Open Files           │                        │
│   ◎ package.json     │                        │
│ ──────────           │                        │
│ Recent Files         │                        │
│   ○ src/App.tsx      │                        │
│ ──────────           │                        │
│ Tasks                │                        │
│   1 task             │                        │
├──────────────────────┴────────────────────────┤
│ > /command or shell input                     │
└──────────────────────────────────────────────┘
```

### Input Interaction Flow

```
User types "/"
  → Slash menu opens with all registered commands
  → Fuzzy-matched as user types more
  → Enter/Tab selects highlighted command, inserts into input
  → User continues typing arguments
  → Autocomplete shows file/dir suggestions for arguments
  → Enter again (no menu open) → submits/executes

User types "npm install"
  → No slash prefix detected
  → Forwarded to active PTY session via WebSocket
  → Output streams live into workspace as TerminalBlock
  → Structured workspace event created

User presses ArrowUp (no menu)
  → History navigation activates
  → Previous command loaded into input
  → User can edit or press Enter to execute
  → Typing resets history cursor
```

### Enter Key Logic

| State | Enter Behavior |
|-------|---------------|
| Slash menu open | Select highlighted command, insert into input, do NOT submit |
| Autocomplete open | Accept highlighted suggestion, insert into input |
| No menu open | Submit/execute the current input |
| History navigating | Execute the loaded command |

### ArrowUp/ArrowDown Priority

1. **Slash menu open** → navigate menu items
2. **Autocomplete open** → navigate suggestions
3. **No menu** → navigate command history
4. **Any other key while menu open** → type normally, menu stays open

---

## 4. Terminal Engine

### PTY Integration

The terminal engine uses **node-pty** to spawn real shell processes:

- **Windows**: PowerShell (`powershell.exe`)
- **Linux/macOS**: bash or zsh (respects `$SHELL`)

### Shell Session Lifecycle

```
Client                  Server                  Shell
  │                       │                       │
  │── WS connect ────────>│                       │
  │                       │── spawn shell ───────>│
  │<── session-created ───│                       │
  │                       │                       │
  │── WS input: "ls\r" ──>│                       │
  │                       │── pty.write("ls\r") ─>│
  │                       │<── pty.onData() ──────│
  │<── WS output: data ───│                       │
  │                       │                       │
  │── WS resize ─────────>│                       │
  │                       │── pty.resize() ──────>│
  │                       │                       │
  │── WS close ──────────>│                       │
  │                       │── pty.kill() ────────>│
```

### Session Management

- Sessions created on demand and tracked in `PTYManager` (Map)
- Each session has: id, cwd, shellType, ptyProcess, outputBuffer, commandHistory
- Sessions persist across commands (no isolated exec calls)
- `PTYManager.ensureActiveSession()` creates default session on first connect
- Multiple sessions supported per WebSocket client

### Interactive App Support

The xterm.js-based `TerminalOutput` component provides:
- Full keyboard forwarding to PTY stdin
- Terminal resize via `FitAddon` + `ResizeObserver`
- Proper cursor rendering and ANSI color support
- This enables vim, nvim, python REPL, ssh, htop, docker

### Commands That Work

| Command | How It Works |
|---------|-------------|
| `npm install` | Sent to PTY via WebSocket, output streams live |
| `git status` | Sent to PTY, output rendered in TerminalBlock |
| `vim file.ts` | Opens in xterm.js TerminalOutput with full keyboard support |
| `python` | Interactive REPL in xterm.js |
| `ssh server` | Interactive SSH session in xterm.js |
| `docker ps` | Command output in TerminalBlock |

---

## 5. Command System

### Architecture

```
Input → Parser → Command Router → Registry → Executor → Command.execute()
                                         ↓
                                   Autocomplete → fuzzyMatch()
```

### Command Registration

Each command is a separate file in `src/core/commands/` that self-registers:

```ts
// open.ts
const openCommand: Command = {
  name: 'open',
  description: 'Open and display a file',
  aliases: ['o', 'cat', 'view'],
  execute(args) { /* ... */ },
  autocomplete(args) { /* ... */ },
  validate(args) { /* ... */ },
};
registry.register(openCommand);
```

### Command Interface

```ts
interface Command {
  name: string;           // /name
  description: string;    // shown in slash menu
  aliases: string[];      // alternative names
  execute(args: string[]): Promise<CommandResult>;
  autocomplete(args: string[]): Promise<AutocompleteItem[]>;
  validate(args: string[]): string | null;  // error message or null
}
```

### Registered Commands

| Command | Aliases | Description |
|---------|---------|-------------|
| `/open` | o, cat, view | Open and display a file |
| `/copy` | cp | Copy a file or directory |
| `/move` | mv, rename | Move or rename |
| `/delete` | rm, del, remove | Delete (requires `-f` to force) |
| `/search` | grep, find | Search file contents for pattern |
| `/run` | exec, ! | Execute a shell command |
| `/git` | g | Run git commands |
| `/browser` | browse, preview, open | Preview HTML in iframe |
| `/task` | todo, tasks | Manage todo tasks |
| `/ai` | ask | Ask AI about the workspace |
| `/agent` | auto, workflow | Run autonomous agent |

### Slash vs Shell Command Routing

| Input Pattern | Route | Handler |
|---------------|-------|---------|
| `/open file.ts` | Internal | Command registry → Executor |
| `npm install` | Shell | WebSocket → PTY session |
| `!npm install` | Shell | Parsed as `/run npm install` → Shell API |

### Fuzzy Matching

The autocomplete engine uses:
1. **Substring match** — checks if query is contained in command name
2. **Fuzzy character match** — checks if all query chars appear in order
3. **Scoring** — exact match (100), prefix (80), substring (60), fuzzy (40)

---

## 6. Filesystem Layer

### Architecture

Filesystem operations go through a REST API on the Express server:

```
Command → fetch('/api/fs/...') → Express Route → fs-extra → Response
```

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fs/list?dir=` | GET | List directory contents |
| `/api/fs/read?path=` | GET | Read file contents |
| `/api/fs/copy` | POST | Copy file/directory |
| `/api/fs/move` | POST | Move file/directory |
| `/api/fs/delete` | POST | Delete file/directory |
| `/api/fs/search?pattern=&dir=` | GET | Search file contents |
| `/api/fs/tree?dir=&depth=` | GET | Recursive file tree |
| `/api/workspace` | GET | Workspace info |
| `/preview/*` | GET | Static file serving for browser preview |
| `/api/shell/exec` | POST | Execute shell command (non-PTY) |

### Safety

All filesystem endpoints validate that the resolved path stays within the workspace directory using `path.resolve()` + `.startsWith(WORKSPACE)` checks. Path traversal attacks are blocked.

### Search Implementation

Uses `grep -rn` on the server for pattern matching across `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html` files. Results include file path, line number, and matching content.

---

## 7. State Management

### Architecture

There is no external state management library. State is managed through:
- **React useState/useCallback** — component-local state in App.tsx
- **Singleton classes** — `CommandHistory`, `PTYManager` (server)
- **useRef** — for mutable references (WebSocket, terminal message IDs)
- **Custom hooks** — `useTerminal`, `useCommandHistory`, `useAutocomplete`

### Key State

| State | Location | Type | Description |
|-------|----------|------|-------------|
| messages | App.tsx | `Message[]` | Workspace event stream |
| inputValue | App.tsx | string | Current input text |
| sessions | useTerminal.ts | `SessionState[]` | All PTY sessions |
| activeSessionId | useTerminal.ts | string | Active PTY session |
| splitNodes | App.tsx | `SplitNode[]` | Split pane layout tree |
| suggestions | useAutocomplete.ts | `AutocompleteItem[]` | Autocomplete items |
| commandHistory | command-history.ts | class | Global history store |
| processes | App.tsx | `ProcessInfo[]` | Background processes |
| openTabs | App.tsx | string[] | Open file tabs |
| recentFiles | App.tsx | string[] | Recent files list |

### Persistence

Currently in-memory only. No localStorage or file-based persistence. On page reload, all state is lost (sessions, history, messages). Server-side PTY sessions persist as long as the server runs.

---

## 8. Keyboard Interaction System

### Complete Keyboard Map

| Key | Context | Behavior |
|-----|---------|----------|
| `/` | Input empty | Opens slash command menu |
| `Enter` | Menu open | Selects highlighted suggestion, inserts into input |
| `Enter` | No menu | Submits/executes current input |
| `Enter` | Autocomplete open | Accepts suggestion |
| `ArrowUp` | Menu open | Navigate up through suggestions |
| `ArrowUp` | No menu | Navigate up through command history |
| `ArrowDown` | Menu open | Navigate down through suggestions |
| `ArrowDown` | No menu | Navigate down through command history |
| `Tab` | Menu open | Same as Enter — selects suggestion |
| `Escape` | Menu open | Closes menu |
| `Escape` | No menu | Resets history navigation |
| Any char | History navigating | Resets history cursor, edits normally |

### Interaction Priority

```
if slashMenuOpen || autocompleteOpen:
   arrows → navigate menu
   enter  → select item (no submit)
   tab    → select item
   escape → close menu
   other  → type normally

else:
   arrows → history navigation
   enter  → submit
   escape → reset history
```

### History Navigation Details

- `ArrowUp` loads previous command, saves current input
- `ArrowDown` loads next command, or returns to saved input
- `CommandHistory` tracks bot`h slash-commands and shell-commands together
- Dedup: consecutive identical entries are collapsed
- Max 200 entries

---

## 9. Rendering Pipeline

### Event/Messag`e Rendering

Each submitted command creates a `Message` in the workspace stream:

```
User: /open package.json
  → message-block (user type, blue prefix)
  → file content rendered as <pre> block

User: npm install
  → message-block (user type)
  → TerminalBlock with collapsible ANSI-rendered output

User: /ai analyze project
  → message-block (user type)
  → system response block with AI answer
```

### Terminal Streaming

For shell commands:
1. User types `npm install`
2. Message created with `type: 'terminal'`
3. WebSocket output events update the message's `data.output` array
4. `TerminalBlock` component renders output with ANSI parsing
5. Output accumulates and scrolls in real-time
6. Collapsible header shows command name, line count, running status

### ANSI Parsing Pipeline

```
Raw PTY output
  → ansi-parser.ts parseAnsi()
  → AnsiChunk[] with style metadata
  → TerminalBlock renders as styled <span> elements with colors
```

### Scrolling

- Workspace auto-scrolls to bottom on new messages
- TerminalBlock content scrolls independently (max-height 400px)
- xterm.js handles its own scrollback buffer

---

## 10. Project Structure

```
lemu/
├── index.html                     # Vite entry HTML
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vite.config.ts                 # Vite build configuration
│
├── server/                        # Backend (Node.js + Express)
│   ├── index.ts                   # HTTP server, REST API endpoints
│   ├── ws.ts                      # WebSocket server for PTY I/O
│   └── pty/
│       ├── pty-manager.ts         # PTY session manager (create/destroy/switch)
│       └── shell-session.ts       # Individual shell session (node-pty wrapper)
│
└── src/                           # Frontend (React + TypeScript)
    ├── main.tsx                   # React entry point
    ├── App.tsx                    # Root component, state, routing, layout
    │
    ├── core/
    │   ├── ai/                    # AI integration layer
    │   │   ├── types.ts           #   AI types (messages, tools, providers)
    │   │   ├── provider.ts        #   OpenAI-compatible API provider
    │   │   ├── mcp-tools.ts       #   MCP tool definitions (6 tools)
    │   │   ├── agent.ts           #   Multi-step agent orchestration
    │   │   ├── context.ts         #   System prompt builder
    │   │   └── index.ts           #   Barrel export
    │   │
    │   ├── autocomplete/
    │   │   └── index.ts           # Fuzzy matching + scoring
    │   │
    │   ├── commands/              # Slash command implementations
    │   │   ├── types.ts           #   Command interface definitions
    │   │   ├── registry.ts        #   Command registry (name→Command map)
    │   │   ├── open.ts            #   /open
    │   │   ├── copy.ts            #   /copy
    │   │   ├── move.ts            #   /move
    │   │   ├── delete.ts          #   /delete
    │   │   ├── search.ts          #   /search
    │   │   ├── run.ts             #   /run, !
    │   │   ├── git.ts             #   /git
    │   │   ├── browser.ts         #   /browser
    │   │   ├── task.ts            #   /task
    │   │   ├── ai-cmd.ts          #   /ai
    │   │   ├── agent-cmd.ts       #   /agent
    │   │   └── index.ts           #   Imports all, re-exports
    │   │
    │   ├── executor/
    │   │   └── index.ts           # Command execution + autocomplete dispatch
    │   │
    │   ├── history/
    │   │   └── command-history.ts # History store (typed entries, navigation)
    │   │
    │   ├── parser/
    │   │   └── index.ts           # Input parser (/command, !command, plain)
    │   │
    │   └── terminal/
    │       ├── ansi-parser.ts     # ANSI escape code → styled segments
    │       ├── shell-history.ts   # Shell output history buffer
    │       ├── terminal-events.ts # Terminal event types
    │       └── terminal-renderer.ts # Terminal output buffer management
    │
    ├── hooks/
    │   ├── useAutocomplete.ts     # Autocomplete state + logic
    │   ├── useCommandHistory.ts   # History navigation hook
    │   └── useTerminal.ts         # WebSocket + PTY session management
    │
    ├── components/
    │   ├── InputBar.tsx           # Input field with command menu overlay
    │   ├── Workspace.tsx          # Split pane or message stream rendering
    │   ├── Sidebar.tsx            # Navigation sidebar (sessions, files, tasks)
    │   ├── TerminalTabBar.tsx     # Tab bar for terminal sessions
    │   ├── TerminalOutput.tsx     # xterm.js interactive terminal component
    │   ├── TerminalBlock.tsx      # Collapsible ANSI-rendered output block
    │   ├── SplitPane.tsx          # Recursive split pane layout engine
    │   └── ProcessMonitor.tsx     # Background process list
    │
    └── styles/
        ├── global.css             # CSS reset, theme variables, scrollbar
        └── app.css                # All component styles
```

### Module Purpose Summary

| Directory | Purpose |
|-----------|---------|
| `server/` | Backend: HTTP API, WebSocket, PTY management |
| `src/core/ai/` | AI provider abstraction, MCP tools, agent engine |
| `src/core/autocomplete/` | Fuzzy matching algorithm |
| `src/core/commands/` | Slash command implementations (self-registering) |
| `src/core/executor/` | Routes parsed commands to the correct handler |
| `src/core/history/` | Typed command history with navigation |
| `src/core/parser/` | Input parsing: `/cmd`, `!cmd`, plain shell |
| `src/core/terminal/` | ANSI parsing, terminal events, shell history |
| `src/hooks/` | React hooks for WebSocket, autocomplete, history |
| `src/components/` | UI components |
| `src/styles/` | CSS theme and component styles |

---

## 11. Technologies Used

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | ≥20 | Runtime | Native PTY support, cross-platform |
| **TypeScript** | 5.5 | Language | Type safety across client + server |
| **React** | 18.3 | UI framework | Component model, hooks, ecosystem |
| **Vite** | 5.4 | Build tool | Fast HMR, TypeScript-native, proxy support |
| **Express** | 4.19 | HTTP server | Simple REST API, middleware ecosystem |
| **node-pty** | 1.1 | PTY spawner | Real shell processes, cross-platform |
| **ws** | 8.20 | WebSocket | Real-time bidirectional PTY I/O |
| **@xterm/xterm** | 6.0 | Terminal emulator | Full ANSI, cursor, interactive support |
| **@xterm/addon-fit** | 0.11 | Terminal resize | Auto-fit xterm to container |
| **fs-extra** | 11.2 | File system | Promise-based, recursive ops |
| **cors** | 2.8 | CORS middleware | Dev-mode cross-origin requests |
| **tsx** | 4.16 | TS runner | Run server TypeScript directly |
| **concurrently** | 8.2 | Process runner | Run client + server dev in parallel |

---

## 12. Performance Considerations

### Rendering Optimization

- xterm.js uses its own canvas-based rendering for terminal output
- Message stream uses simple React reconciliation (keyed by `msg.id`)
- Terminal output blocks are collapsible — large outputs hidden until expanded
- Vite code-splits the AI module (dynamic `import()` in `/ai` and `/agent` commands) — AI deps aren't loaded until first use

### Streaming Optimization

- WebSocket provides true push-based streaming — no polling
- Output is buffered per message in `data.output` array
- Maximum output buffer: 100 entries (oldest 50 trimmed)
- TerminalBlock renders ANSI-parsed output incrementally

### Shell Performance

- PTY sessions are persistent — no spawn overhead per command
- Output buffer capped at 1000 lines per session
- Server uses `maxBuffer: 10MB` for shell exec API

### Input Responsiveness

- Autocomplete debounced by React's batching (no explicit debounce needed)
- Fuzzy matching runs on the full command list (11 commands) — O(n) trivial
- Keyboard events handled synchronously in `handleKeyDown`

### Memory Handling

- Messages array grows unbounded (potential issue for long sessions)
- Command history capped at 200 entries
- Terminal output blocks accumulate data per message
- PTY process output buffers trimmed at 1000 entries

---

## 13. Extensibility & Future Architecture

### AI-Ready Systems

The following systems are already designed for AI integration:

1. **MCP Tool Layer** (`core/ai/mcp-tools.ts`): 6 tools that wrap workspace capabilities — ready for any AI provider to call them
2. **AI Provider Abstraction** (`core/ai/provider.ts`): OpenAI-compatible interface — swap in any provider (Ollama, Anthropic, local LLM)
3. **Agent Engine** (`core/ai/agent.ts`): Tool-use loop with configurable max iterations
4. **Context Builder** (`core/ai/context.ts`): Structured system prompts with workspace state

### Extension Points

| Extension Point | Location | What It Enables |
|----------------|----------|-----------------|
| Command Registry | `core/commands/registry.ts` | Add new slash commands without touching core |
| MCP Tool Array | `core/ai/mcp-tools.ts` | Add new tools the AI can use |
| AI Provider | `core/ai/provider.ts` | Swap AI backends (OpenAI → Ollama → Anthropic) |
| PTY Manager | `server/pty/pty-manager.ts` | Add session clustering, terminal sharing |
| WebSocket Protocol | `server/ws.ts` | Add new message types for new features |
| SplitPane | `components/SplitPane.tsx` | Nested layouts, terminal grids |
| Workspace | `components/Workspace.tsx` | New block types for new data types |

### Future Capabilities Roadmap

| Capability | Status | What's Needed |
|-----------|--------|---------------|
| **Local LLM support** | Ready | Point `/ai config endpoint=http://localhost:11434/v1` to Ollama |
| **Browser automation** | Architecture ready | Implement Puppeteer/Playwright as an MCP tool |
| **Autonomous workflows** | Ready | `/agent` already supports multi-step tool use |
| **Semantic search** | Needs implementation | Add embeddings + vector search as MCP tool |
| **Plugin system** | Architecture ready | Dynamic command loading from external files |
| **Task orchestration** | Needs implementation | Multi-agent coordination, workflow DAGs |
| **Terminal sharing** | Architecture ready | WebSocket broadcast for pair programming |
| **State persistence** | Needs implementation | localStorage or IndexedDB for history + sessions |
| **Multi-workspace** | Architecture ready | PTY Manager already supports multiple sessions |

---

## 14. Current Limitations

### Known Issues

1. **Messages array grows unbounded** — no cleanup mechanism for old messages
2. **No state persistence** — history and messages lost on page reload
3. **Server sessions lost on restart** — PTY processes killed when server restarts
4. **Split pane resize** — divider dragging not implemented (CSS `col-resize` cursor only)
5. **Process monitoring** — `/api/ws` `list-processes` returns hardcoded mock data, not real OS processes
6. **Search limited to grep** — only works on systems with `grep` installed (Linux/macOS); Windows implementation needed

### Architectural Constraints

1. **Single WebSocket connection** — all session traffic multiplexed over one connection
2. **No authentication** — server is entirely open (dev-only design)
3. **Browser-only** — requires a web browser; no TUI/CLI native mode
4. **In-memory only** — no database or persistent storage
5. **Vite proxy dependency** — client expects `/api` and `/ws` proxied to backend

### Performance Bottlenecks

1. **Large output blocks** — terminal output for long-running commands accumulates in React state
2. **No output virtualization** — workspace renders all messages; long sessions = slow render
3. **No request debouncing** — autocomplete fires on every keystroke (acceptable for 11 commands)
4. **Single-threaded PTY** — all sessions share a single Node.js event loop

### Unsupported Workflows

1. **No tab persistence** — open tabs reset on reload
2. **No split pane persistence** — layout resets on reload
3. **No workspace save/restore** — cannot resume a previous session
4. **No file watcher** — no live file change detection
5. **No notification system** — no way to signal long-running task completion

---

## 15. Recommended Next Steps

### Short-Term (1-2 weeks)

1. **Message cleanup** — Implement max message limit (e.g., 500) with automatic oldest removal
2. **State persistence** — Save history + settings to localStorage; restore on reload
3. **Session reconnection** — Auto-reconnect WebSocket on disconnect with session list recovery
4. **Split pane resize** — Implement draggable dividers between split panes
5. **Real process monitoring** — Use OS-level process listing (e.g., `tasklist` on Windows, `ps` on Unix)

### Medium-Term (1-2 months)

6. **Tab persistence** — Save open tabs + split layout to localStorage, restore on reload
7. **Search cross-platform** — Implement pure Node.js recursive search (replace grep dependency)
8. **Output virtualization** — Virtual-scroll the message stream for long sessions
9. **Workspace sessions** — Save/restore entire workspace state (tabs, splits, cwd)
10. **Notification system** — Terminal bell, task completion signals, error alerts
11. **Plugin infrastructure** — Dynamic command loading from external `.ts` files

### Long-Term (3-6 months)

12. **Local LLM integration** — Default to Ollama for offline AI; OpenAI as premium option
13. **Browser automation** — Full MCP tool for Puppeteer/Playwright
14. **Semantic search** — Embedding-based code search via MCP tool
15. **Multi-workspace** — Multiple workspace tabs, each with its own PTY sessions
16. **Collaborative features** — Share terminal sessions via WebSocket broadcast
17. **Native shell mode** — Standalone TUI using blessed/ink for environments without a browser
18. **MCP server** — Expose all workspace capabilities as a standalone MCP server for external AI tools
