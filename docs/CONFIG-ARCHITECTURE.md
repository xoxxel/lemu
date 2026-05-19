# Configuration Architecture: Manifest / Settings / State Separation

> **Status:** Implemented. All 8 plugins have been migrated to the three-layer model.

## Core Principle

| Layer | Nature | Editable | Storage | Example |
|-------|--------|----------|---------|---------|
| **Manifest** | Static, architectural, version-controlled | Never | TypeScript (`manifest.ts`) | capabilities, permissions, apis, services |
| **Settings** | Dynamic, user-configurable | Yes | `PluginSettings` in AppContext | model name, maxResults, toggles |
| **State** | Ephemeral, session-bound | N/A | In-memory runtime | open tabs, pending suggestions |

## File Layout Per Plugin

```
plugins/<id>/
  manifest.ts     → PluginManifest (static contract)
  settings.ts     → default values + settings schema
  index.ts        → Plugin object (references both)
  docs.ts         → PluginDocs (optional)
```

## AppContext Key Namespacing

| Key | Type |
|-----|------|
| `plugin:manifest:<id>` | PluginManifest (raw) |
| `plugin:manifest:resolved:<id>` | PluginManifest (processed) |
| `plugin:api:<id>` | ApiService |
| `plugin:settings:<id>` | saved settings |
| `plugin:settings:override:<id>` | runtime overrides |
| `plugin:settings:resolved:<id>` | defaults + saves + overrides merged |
| `plugin:settings-schema:<id>` | PluginSettingsSchema |

## Resolution Order

```
Plugin.settings (defaults)
    ↓
saveSettings() — persisted user preferences
    ↓
applySettingsOverride() — runtime / CLI overrides
    ↓
resolveSettings() → merged result in plugin:settings:resolved:<id>
```

## 1. Plugin Audit Summary

### Interface (Contract)

All 8 plugins implement the `Plugin` interface. The shape is consistent but the implementation of each hook varies widely:

| Field | Used by | Notes |
|-------|---------|-------|
| `id` | All | Static string, never configurable |
| `name` | All | Static string, for display |
| `version` | All | Static semver |
| `activate` | All | Always: `for (cmd of this.commands) ctx.commands.register(cmd)` — boilerplate |
| `commands` | 7/8 | feedback is the only plugin without commands |
| `actions` | 7/8 | feedback has none; most use `standardActions` |
| `views` | 7/8 | feedback has none |
| `onInput` | 3/8 | calculator, search, ai — direct tab input handling |
| `onCommandExecuted` | 1/8 | fs only — emits events after command completion |
| `onReady` | 1/8 | calculator only — no-op console.log |
| `onCleanup` | 1/8 | calculator only — no-op console.log |
| `onConfig` | **0/8** | defined in interface but never implemented |
| `onEvent` | **0/8** | new hook, not yet used |
| `onIntent` | **0/8** | new hook, not yet used |
| `docs` | 7/8 | feedback has none |

### Access Patterns

| Plugin | Server API | Client-side only | Stateful | Event emitter | Foreign plugin dep |
|--------|-----------|-----------------|----------|---------------|-------------------|
| fs | `/api/fs/*` | — | — | Yes (7 event types) | — |
| calculator | — | Pure | Tab state only | Yes | — |
| exec | `/api/shell/exec` | — | — | — | — |
| git | `/api/shell/exec` | — | — | — | — |
| help | — | Registry reader | — | — | Reads all plugins |
| search | `/api/fs/search`, `/api/fs/tree` | — | Module-level `_lastResults` | — | Calls `runtime.execute('open')` |
| ai | External HTTPS | Lazy import | API key in memory | — | Core AI module |
| feedback | — | No-op | — | — | — |

### Hardcoded Values Inventory

**API endpoints** (6 unique paths, 11 references total):
- `/api/fs/read` — fs/open
- `/api/fs/list` — fs/open, fs/copy, fs/move, fs/delete
- `/api/fs/copy` — fs/copy
- `/api/fs/move` — fs/move
- `/api/fs/delete` — fs/delete
- `/api/fs/search` — search
- `/api/fs/tree` — search
- `/api/shell/exec` — exec/run, git/git

**Business logic constants** (hardcoded per plugin):
- calculator: math function list, formatting thresholds (`1e15`, `1e-6`, `toPrecision(12)`)
- search: tree depth (`5`), supported extensions for content search
- git: subcommand autocomplete list (15 items)
- exec: autocomplete suggestions (5 items)
- ai: agent iteration limit (`25`), endpoint defaults, model name (`gpt-4o`)

**View type strings** (used as routing keys, must stay synchronized between plugin and App.tsx):
- `editor`, `calculator`, `exec`, `git`, `help`, `search`, `ai`, `agent`

**Event name strings** (legacy `fs:copy`, `fs:move` etc. + domain events `fs:copied`, `fs:moved` etc.)

---

## 2. Common Patterns

1. **Activate boilerplate** — Every non-trivial plugin repeats `for (const cmd of this.commands!) ctx.commands.register(cmd)` in `activate`. This could be done automatically by the loader.
2. **API wrapper pattern** — fs/open/copy/move/delete, search, exec, git all define a local `const api = { ... }` object wrapping `fetch()` calls. The structure is identical: POST/GET, JSON, error check.
3. **Tab routing** — Every command that opens a view returns `data: { type: '<view-type>', ... }`. The App.tsx matches `d.type` against registered view components. This works but is implicit.
4. **Action scoping** — Actions have a `type` field that restricts them to a specific tab type. search's `openAction` has `type: 'search'`. calculator's actions have no type (global).
5. **Docs shape** — Every plugin with docs follows `PluginDocs` interface exactly: overview, examples, workflows, troubleshooting, tips, limitations.

---

## 2. Per-Plugin Manifest & Settings (current implementation)

Each plugin now has a `manifest.ts` (static) and `settings.ts` (default values + schema).

### fs
```json
{
  "apis": {
    "read": { "path": "/api/fs/read", "method": "GET" },
    "list": { "path": "/api/fs/list", "method": "GET" },
    "copy": { "path": "/api/fs/copy", "method": "POST" },
    "move": { "path": "/api/fs/move", "method": "POST" },
    "delete": { "path": "/api/fs/delete", "method": "POST" }
  },
  "permissions": { "filesystem": true },
  "defaults": {
    "deleteRequiresForce": true,
    "workspaceValidation": true
  }
}
```

### calculator
```json
{
  "permissions": { "clipboard": true },
  "defaults": {
    "precision": 12,
    "exponentialThreshold": 1e15,
    "smallThreshold": 1e-6
  }
}
```

### exec
```json
{
  "apis": {
    "shell": { "path": "/api/shell/exec", "method": "POST" }
  },
  "permissions": { "shell": true },
  "defaults": {
    "autocompleteSuggestions": ["npm ", "git ", "node ", "ls", "cat "]
  }
}
```

### git
```json
{
  "apis": {
    "shell": { "path": "/api/shell/exec", "method": "POST" }
  },
  "permissions": { "shell": true },
  "defaults": {
    "subcommands": ["status","add","commit","push","pull","branch","checkout","log","diff","merge","clone","stash","tag","fetch","rebase"],
    "prefix": "git"
  }
}
```

### search
```json
{
  "apis": {
    "search": { "path": "/api/fs/search", "method": "GET" },
    "tree": { "path": "/api/fs/tree", "method": "GET" }
  },
  "permissions": { "filesystem": true },
  "dependencies": ["fs"],
  "defaults": {
    "treeDepth": 5,
    "contentExtensions": [".ts",".tsx",".js",".jsx",".json",".md",".css",".html"]
  }
}
```

### ai
```json
{
  "services": {
    "llm": {
      "type": "openai",
      "required": true,
      "defaultEndpoint": "https://api.openai.com/v1",
      "defaultModel": "gpt-4o"
    }
  },
  "permissions": { "network": true },
  "defaults": {
    "maxAgentIterations": 25,
    "maxTokens": 4096
  }
}
```

### help
```json
{
  "permissions": {},
  "defaults": {}
}
```

### feedback
```json
{
  "permissions": {},
  "defaults": {}
}
```

All phases of the migration plan have been completed. The remaining content below documents the original analysis that informed the implementation.

> **How are existing plugins built?**
All implement the `Plugin` interface. `activate` is the only required lifecycle hook. Commands are registered manually in `activate`.

> **Are all plugins structurally the same?**
No. Three structural families:
1. **API plugins** (fs, exec, git, search) — call server endpoints, return view data
2. **Pure client plugins** (calculator, help) — self-contained logic, no server deps
3. **External service plugins** (ai) — dynamic imports, external API, lazy initialization
4. **No-op plugins** (feedback) — empty shell for future use

> **Where will configuration come from?**
Three-tier: (1) plugin-declared defaults → (2) environment variables → (3) user config file at workspace root → (4) runtime overrides via `/config` command. Each tier merges into AppContext.

> **Does config need to be hot-reloadable?**
Yes, for the user config file tier. The `AppContext.onChange` listener already supports this pattern. Plugin hooks (`onConfig`) can re-initialize when their namespace changes.

> **Who validates config?**
The PluginLoader validates the schema shape. Individual plugins validate semantic correctness in `onConfig` (which returns the validated config).

> **What's already in AppContext?**
Currently empty as of initialization. The event refactoring already added `appContext` to `PluginContext`. Config will populate it under the `plugin:config:*` namespace.
