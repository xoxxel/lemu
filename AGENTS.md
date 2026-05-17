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

### Plugin System (not `src/core/commands/`)

Commands live in `src/plugins/*/` and register via the `Plugin` interface (`src/core/plugin-system/types.ts`). Each plugin has:
- `activate(ctx)` — called at load time; used to register commands via `ctx.commands.register(cmd)`
- `onReady(ctx)`, `onCommandExecuted(payload)`, `onCleanup()` — optional lifecycle hooks

Plugins are registered in `src/main.tsx:34` — add new plugins there.

### Input Routing

| Input | Route |
|-------|-------|
| `/cmd args` | Runtime executor → command registry lookup |
| `!cmd args` | Parser rewrites to `/run cmd args` |
| `@topic` | Inline help lookup in App.tsx (hardcoded) |
| `plain text` | WebSocket → PTY shell session |

### Hardcoded Overrides in App.tsx

`/terminal` and `/open`/`/edit` are handled in `App.tsx:203-224` **before** the runtime executor. `/open` creates editor tabs (read-only `<pre>` previews). Other `/cmd` routes fall through to `getRuntime().execute()`.

### Key Architecture Notes

- ARCHITECTURE.md describes an **outdated** command system (old `src/core/commands/` self-registration). The real system is the plugin architecture in `src/plugins/` + `src/core/plugin-system/`.
- Server search (`/api/fs/search`) is pure Node.js walk + `String.includes()` — no `grep` dependency (contrary to ARCHITECTURE.md claims).
- All state is in-memory. No persistence. Lost on page reload.
- PTY sessions are lazy-created (first shell command triggers `ensureSession()`). No session on WebSocket connect.
- AI module is code-split (`dynamic import()` in ai-cmd.ts and agent-cmd.ts).
- Filesystem endpoints validate paths via `path.resolve() + .startsWith(WORKSPACE)`.

### Adding a New Command

1. Create file in `src/plugins/<your-plugin>/<cmd>.ts` implementing `Command` interface (`src/core/commands/types.ts`)
2. Create or update plugin in `src/plugins/<your-plugin>/index.ts` that registers the command in `activate()`
3. Import and pass the plugin in `src/main.tsx` bootstrap array
