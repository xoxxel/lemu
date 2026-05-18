# lemu — Agent Guidance

## Dev Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Starts Vite (5173) + Express (3001) concurrently |
| `npm run build` | `tsc && vite build` |
| `npm run dev:client` | Vite only |
| `npm run dev:server` | `nodemon --exec tsx server/index.ts` |

No lint, typecheck, test, or formatter commands exist.

## Architecture

**lemu** is a browser-based terminal workspace. React frontend (`src/`) + Express/WebSocket backend (`server/`). Vite proxies `/api` and `/ws` to the backend on port 3001.

### Input Routing

Input is classified by its first character by `src/core/input-router.ts`:

| Input | Route |
|-------|-------|
| `/cmd args` | `classifyInput()` → command mode → `runtime.execute()` → command registry |
| `!cmd args` | Parser → `{ name: 'run', args: ['cmd args'] }` → plugin exec |
| `@topic` | Help mode → `runtime.execute({ name: 'help', args: [topic] })` |
| `>action` | Action mode → plugin action on active tab via action registry |
| `:cmd` | Terminal mode → strips `:` → PTY shell session |
| `plain text` | Tab mode → active tab's plugin `onInput()` or feedback |

Only `/terminal` is hardcoded in `App.tsx` (for session management). All other `/cmd` routes go through plugins.

Terminal is no longer the default input owner. The active workspace tab owns input by default. Terminal requires explicit `:` prefix.

### Plugin System

Commands live in `src/plugins/*/` and register via the `Plugin` interface (`src/core/plugin-system/types.ts`). Each plugin has:

Required:
- `activate(ctx)` — register commands, actions, views via the context

Optional lifecycle hooks: `deactivate(ctx)`, `onConfig(config)`, `onReady(ctx)`, `onAppRender(ctx)`, `onCommandExecuted(payload)`, `onInput(payload)`, `onCleanup()`

Optional properties: `commands`, `actions`, `views`, `docs`

Views (`ctx.views.register(type, component, meta)`) create new tab types rendered via `runtime.viewComponentMap`. Actions (`ctx.actions.register(type, action)`) are invoked with `>action-name` when a matching tab is active.

Plugins may implement `onInput(payload)` to accept direct input when their tab is active. If not implemented, the runtime shows feedback: "X does not accept direct input."

Plugins are auto-discovered via `import.meta.glob('./plugins/*/index.ts', { eager: true })` in `src/main.tsx` — no manual registration needed.

### Key Architecture Notes

- ARCHITECTURE.md describes an **outdated** command system (old `src/core/commands/` self-registration). The real system is the plugin architecture in `src/plugins/` + `src/core/plugin-system/`.
- Server search (`/api/fs/search`) is pure Node.js walk + `String.includes()` — no `grep` dependency (contrary to ARCHITECTURE.md claims).
- All state is in-memory. No persistence. Lost on page reload.
- PTY sessions are lazy-created on first shell command or `:` prefix (client-side `ensureSession()`). No session on WebSocket connect.
- AI module is code-split (`dynamic import()` in ai-cmd, agent-cmd, and ai onInput) — first use is slow.
- Filesystem endpoints validate paths via `path.resolve() + .startsWith(WORKSPACE)`.
- Feedback system (`src/core/feedback/`) emits events via event bus; App.tsx shows them in a FeedbackBar.
- Tab pinning keeps tabs visible in sidebar even when not active.
- Mode indicator in InputBar shows `[terminal]` when input starts with `:`, otherwise shows active tab label.

### Adding a New Plugin

1. Create `src/plugins/<your-plugin>/index.ts` exporting a valid `Plugin` object
2. Done — no other files need modification

### Adding a New Command

1. Create file in `src/plugins/<your-plugin>/<cmd>.ts` implementing `Command` interface (`src/core/commands/types.ts`)
2. Add it to the plugin's `commands` array or register in `activate()` via `ctx.commands.register(cmd)`
