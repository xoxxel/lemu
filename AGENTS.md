# lemu — Agent Guidance

## Dev Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Vite (5173) + Express (3001) concurrently |
| `npm run build` | `tsc && vite build` |
| `npm run dev:client` | Vite only |
| `npm run dev:server` | `nodemon --exec tsx server/index.ts --ext ts,js --watch server` |
| `npm run preview` | `vite preview` |

No lint, typecheck, test, or formatter commands exist. `test/` has architecture notes only.

## Interaction Protocol — Strict Namespace Isolation

Five root namespaces enforced by the grammar parser (`src/core/grammar/parser.ts`) + scope resolver (`src/core/scope/scope-resolver.ts`):

| Input | Scope | Resolution |
|-------|-------|------------|
| `/cmd args` | `command` | Grammar parser parses → `commandNodeToParsedCommand()` → `runtime.execute()` → command registry |
| `!cmd args` | `command` | Legacy shortcut, maps to `{ name: 'run', args: [...] }` |
| `:cmd` | `terminal` | Strips `:` → PTY shell via `ensureSession()` (lazy-created) |
| `@topic` | `help` | `runtime.execute({ name: 'help', args: [topic] })` |
| `>action` | `action` | Plugin action on active tab — NEVER global |
| `*>action` | `global-action` | Global/system action — NEVER plugin |
| `plain text` | `primary` | Active tab's plugin `onInput()` or idle feedback |

Only `/terminal` is hardcoded in `App.tsx`. All other `/cmd` routes go through plugins. `!` still works but routes through the grammar/command system.

**Enforced rules** (see `App.tsx:322-350`):
- `*>` resolves **only** from `actionRegistry.getGlobal()` — never plugin scoped
- `>` resolves **only** from `actionRegistry.getScoped(tabType)` — never global
- No active tab with `>` → returns idle, never falls through to global
- `resolveScope()` in `scope-resolver.ts` enforces strict one-to-one prefix-to-scope mapping
- **Ownership** (`src/core/ownership/`): `ownsInput: true` on an action acquires plain-text input ownership. Root triggers (`/`, `:`, `@`, `>`, `*>`) always release ownership and resolve normally. Only one owner at a time.

## Plugins (11 total, auto-discovered via `import.meta.glob` in `src/main.tsx`)

| ID | Commands | Views | Notes |
|----|----------|-------|-------|
| `ai` | `ai`, `agent` | `ai`, `agent` | `onInput` for chat; AI code-split (dynamic import, first use slow) |
| `calculator` | `calculator` | `calculator` | `onInput`, `onCleanup`, `primaryInput` enabled |
| `coder` | `coder` | — | AI-powered code editing, generates edit proposals |
| `edit` | `edit` | `edit-workflow` | Propose → diff → apply workflow; `primaryInput` enabled |
| `exec` | `run` | `exec` | `!cmd` maps here |
| `feedback` | — | — | No-op plugin, only manifest + settings |
| `fs` | `open`, `copy`, `move`, `delete` | `editor` | `onCommandExecuted` emits domain events |
| `git` | `git` | `git` | Non-interactive git via `execSync` |
| `help` | `help` | `help` | Dynamically generated from plugin manifests |
| `search` | `search` | `search` | `onInput` for re-search on active tab |
| `settings` | — | `settings` | Settings viewer/editor with `onInput`; opened via `*>settings` |

## Plugin Three-Layer Separation

| Layer | Key in Plugin | Editable | Purpose |
|-------|---------------|----------|---------|
| Manifest | `manifest` | No | Capabilities, permissions, services, dependencies, events |
| Settings | `settings` | Yes | User-configurable defaults |
| Settings Schema | `settingsSchema` | No | Validation/UI generation |
| State | in-memory | N/A | Via `AppContext` / tab state |

Plugins can also declare `interaction: { primaryInput?, placeholders? }` for structured input and custom placeholder text.

## Server (`server/index.ts`)

Express on port 3001. Workspace from `LEMU_WORKSPACE` env var (falls back to `process.cwd()`). All paths validated via `path.resolve() + .startsWith(WORKSPACE)`.

- `GET /api/fs/list`, `/api/fs/read`, `/api/fs/tree`, `/api/fs/search`
- `POST /api/fs/copy`, `/api/fs/move`, `/api/fs/delete`, `/api/fs/write`
- `POST /api/shell/exec` (blocking `execSync`)
- `GET /api/workspace`
- `GET /preview/*`
- WebSocket `/ws` for PTY I/O (node-pty, lazy sessions; no auto-create)

Search is pure Node.js walk + `String.includes()` — no `grep`. Only searches: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`.

## Architecture Notes

- **Outdated docs**: `docs/ARCHITECTURE.md` and `architect.md` describe the old system. Real system is `src/plugins/` + `src/core/plugin-system/`.
- **All state is in-memory** — lost on page reload. No state management library (plain React).
- **AI module** is code-split (`dynamic import()`) — first use is slow.
- **Actions**: Registry (`src/core/actions/registry.ts`) has strict separation: `register('*', action)` for global, `register(type, action)` for scoped. `findGlobal()` / `findScoped()` never cross-contaminate.
- **Ownership**: `src/core/ownership/ownership-manager.ts` enforces formal acquire/release lifecycle. `PluginAction.ownsInput` marks an action as taking ownership of subsequent plain-text input. Root prefixes always release and bypass ownership.
- **Grammar system** (`src/core/grammar/`) is the canonical parser path. Old `classifyInput()` / `parse()` are fallbacks for `!` prefix and legacy compatibility.
- **MCP tools** available in AI/agent: `read_file`, `list_directory`, `search_files`, `run_command`, `get_workspace_info`, `get_file_tree`.

## Interaction Protocol Design

### Plugin Responsibilities (metadata only, no behavior engines)

Plugins declare via the `Plugin` interface:
- `actions` / `getActions()` — standard action list (never implements parsing/routing)
- `interaction.primaryInput` — whether plain text input is accepted, with grammar hint and examples
- `interaction.placeholders` — contextual placeholder text for primary vs action modes
- `manifest` — static architectural capabilities, permissions, dependencies
- `docs` — user-facing documentation
- `onInput()` — processes owned primary input (NOT parsing; receives already-routed text)

Plugins must NOT implement input routing, parsing, ownership management, namespace isolation, or autocomplete.

### System Responsibilities (src/core/ + App.tsx)

| Concern | Owner | Location |
|---------|-------|----------|
| Input routing | `grammarClassify()` → grammar parser | `App.tsx:43-78` |
| Parsing | Grammar `Parser` + adapter | `src/core/grammar/parser.ts` |
| Namespace isolation | `resolveScope()` + scope resolver | `src/core/scope/scope-resolver.ts` |
| Autocomplete (scope-aware) | `SuggestionEngine` + `useAutocomplete` | `src/core/grammar/suggest.ts`, `src/hooks/useAutocomplete.ts` |
| Action resolution (scoped) | `actionRegistry.getGlobal()` / `getScoped()` | `src/core/actions/registry.ts` |
| Mode transitions | `App.tsx handleSubmit()` | `App.tsx:286-529` |
| Placeholder switching | `getScopePlaceholder()` | `src/core/scope/scope-resolver.ts:47-59` |

### Two Official `>` Interaction Types

| Type | Flag | Behavior |
|------|------|----------|
| **Standard Action** | default | Invoked once by `>actionId`; does not own subsequent input. Examples: `>save`, `>pin`, `>diff` |
| **Ownership Action** | `ownsInput?: true` | `>find` activates and takes ownership of subsequent plain input; root triggers (`/`, `:`, `@`, `>`, `*>`) remain global; action parsing always has higher priority than owned input |

**Ownership rules** (enforced in `App.tsx` via `src/core/ownership/ownership-manager.ts`):
- Only one active owner per plugin at a time
- Formal acquire/release lifecycle via `runtime.ownership.acquire()` / `release()`
- Ownership released on any root trigger (`/`, `:`, `@`, `>`, `*>`)
- Owner timeout support (future)
- Ownership must NOT break action parsing — `>` always resolves action first before falling through to owned primary input
- Autocomplete shows owner status: "owned by \<plugin\>"

### Primary Input Rules

Plain text reaching a plugin tab:
1. Must `interaction.primaryInput.enabled === true` to reach `onInput()`
2. Is NOT an action — cannot be selected via `>` (but can coexist alongside actions)
3. Plugin's `interaction.placeholders.defaultPlaceholder` shown when idle
4. Plugin's `interaction.placeholders.primaryPlaceholder` shown when user types `>`

**Autocomplete scope awareness** (enforced in `useAutocomplete.ts`):
- `*>` → only global actions from `actionRegistry.getGlobal()`
- `>` → only scoped actions from `actionRegistry.getScoped(tabType)`; never global
- `/` → commands from grammar registry + file path completion
- No prefix → prefix autocomplete menu (shows available namespaces)
- Ownership mode → prefixes still complete; status shows current owner

## Adding a Plugin

1. Create `src/plugins/<your-plugin>/index.ts` exporting a valid `Plugin` object
2. No other files need modification (auto-discovered by `import.meta.glob`)

## Adding a Command

1. Create file in `src/plugins/<your-plugin>/<cmd>.ts` implementing `Command` interface (`src/core/commands/types.ts`)
2. Add it to the plugin's `commands` array
