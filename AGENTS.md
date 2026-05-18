# lemu — Agent Guidance

## Dev Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Starts Vite (5173) + Express (3001) concurrently |
| `npm run build` | `tsc && vite build` |
| `npm run dev:client` | Vite only |
| `npm run dev:server` | `nodemon --exec tsx server/index.ts` |
| `npm run preview` | `vite preview` |

No lint, typecheck, test, or formatter commands exist. `test/` directory is empty.

## Input Routing (`src/core/input-router.ts`, `src/core/parser/index.ts`)

| Input | Route |
|-------|-------|
| `/cmd args` | `classifyInput()` → command mode → `runtime.execute()` → command registry |
| `!cmd args` | Parser → `{ name: 'run', args: ['cmd args'] }` → exec plugin |
| `@topic` | Help mode → `runtime.execute({ name: 'help', args: [topic] })` |
| `>action` | Action mode → plugin action on active tab via action registry |
| `:cmd` | Terminal mode → strips `:` → PTY shell session |
| `plain text` | Tab mode → active tab's plugin `onInput()` or feedback |

Only `/terminal` is hardcoded in `App.tsx`. All other `/cmd` routes go through plugins.

## Plugins (10 total, auto-discovered via `import.meta.glob`)

| ID | Commands | Views | Notes |
|----|----------|-------|-------|
| `ai` | `ai`, `agent` | `ai`, `agent` | `onInput` for chat; AI code-split (dynamic import, first use slow) |
| `browser` | `browser` | `browser` | — |
| `calculator` | `calculator` | `calculator` | `onInput`, `onCleanup` |
| `exec` | `run` | `exec` | `!cmd` maps here |
| `feedback` | — | — | no-op plugin |
| `fs` | `open`, `copy`, `move`, `delete` | `editor` | `onCommandExecuted` |
| `git` | `git` | `git`, `diff` | — |
| `help` | `help` | `help` | — |
| `search` | `search` | `search` | — |
| `task` | `task` | `task` | `onConfig`, `onReady`, `onCleanup` |

## Server (`server/index.ts`)

Express on port 3001. Workspace path from `LEMU_WORKSPACE` env var (falls back to `process.cwd()`). All filesystem endpoints validate paths via `path.resolve() + .startsWith(WORKSPACE)`.

- `GET /api/fs/list`, `/api/fs/read`, `/api/fs/tree`, `/api/fs/search`
- `POST /api/fs/copy`, `/api/fs/move`, `/api/fs/delete`
- `POST /api/shell/exec` (blocking `execSync`)
- `GET /api/workspace`
- `GET /preview/*`
- WebSocket `/ws` for PTY I/O (node-pty, lazy sessions)

Search is pure Node.js walk + `String.includes()` — no `grep` dependency.

## Architecture Notes

- **Outdated docs**: `docs/ARCHITECTURE.md` and `architect.md` describe an old command system. Real system is `src/plugins/` + `src/core/plugin-system/`.
- **All state is in-memory** — lost on page reload. No state management library (plain React).
- **PTY sessions** are lazy-created on first `:` or shell command via client-side `ensureSession()`.
- **AI module** is code-split (`dynamic import()`) — first use is slow.
- **MCP tools** available in AI/agent: `read_file`, `list_directory`, `search_files`, `run_command`, `get_workspace_info`, `get_file_tree`.

## Adding a Plugin

1. Create `src/plugins/<your-plugin>/index.ts` exporting a valid `Plugin` object
2. No other files need modification

## Adding a Command

1. Create file in `src/plugins/<your-plugin>/<cmd>.ts` implementing `Command` interface (`src/core/commands/types.ts`)
2. Add it to the plugin's `commands` array or register via `ctx.commands.register(cmd)` in `activate()`
