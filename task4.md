# Refactor Current Architecture into a Plugin-Based System

## Goal

Refactor the EXISTING application into a plugin-based architecture.

IMPORTANT:

* DO NOT add new product features
* DO NOT redesign the UI
* DO NOT change the UX
* DO NOT introduce new commands
* DO NOT add new tools

The objective is ONLY:

# Convert the current tightly-coupled architecture into a modular plugin-based runtime.

The current functionality must remain exactly the same.

---

# High-Level Objective

The application currently has:

* commands
* AI
* filesystem tools
* browser preview
* task system
* git integration

implemented directly inside the core application.

This must be refactored so that:

# ALL non-core functionality becomes plugins.

The user experience should remain unchanged.

---

# Important Constraint

This is a REFACTOR.

NOT:

* a rewrite
* a redesign
* a feature expansion

Behavior must remain compatible with the current implementation.

---

# New Architecture Direction

Move from:

```text id="wm68q9"
core imports commands/features
```

to:

```text id="0bq4f4"
plugins attach themselves to the core runtime
```

---

# Core vs Plugin Separation

---

# CORE (Must Remain in Core)

Only these systems should remain inside core:

## 1. Runtime

Responsible for:

* application lifecycle
* plugin lifecycle
* dependency injection
* event bus
* service registry

---

## 2. PTY / Shell Engine

Responsible for:

* node-pty
* shell sessions
* terminal lifecycle
* streaming output
* shell state

---

## 3. Workspace UI Engine

Responsible for:

* layout
* panels
* split panes
* message rendering
* terminal rendering
* workspace containers

NOT feature-specific panels.

---

## 4. Input System

Responsible for:

* slash parsing
* autocomplete engine
* history navigation
* command routing
* keyboard handling

---

## 5. Plugin System

Responsible for:

* plugin loading
* plugin registration
* plugin lifecycle
* capability exposure

---

# EVERYTHING ELSE MUST BECOME PLUGINS

This includes:

* filesystem commands
* git integration
* AI system
* browser preview
* task system
* MCP tools

---

# Required New Structure

Refactor toward:

```text id="b75kdx"
src/
├── core/
│   ├── runtime/
│   ├── plugin-system/
│   ├── shell/
│   ├── ui/
│   ├── state/
│   └── events/
│
├── plugins/
│   ├── filesystem/
│   ├── git/
│   ├── ai/
│   ├── browser/
│   └── tasks/
```

---

# Plugin Requirements

Each plugin must be isolated.

Each plugin should:

* register itself
* expose commands
* optionally expose panels/tools
* optionally expose services

---

# Required Plugin Interface

Create a unified plugin contract.

Example:

```ts id="jlwm6f"
export interface Plugin {
  id: string
  name: string
  version: string

  activate(ctx: PluginContext): Promise<void>
  deactivate?(): Promise<void>

  commands?: Command[]
  panels?: WorkspacePanel[]
  tools?: MCPTool[]
}
```

---

# Plugin Context

Plugins must receive controlled access to core systems.

Example:

```ts id="if52fd"
export interface PluginContext {
  shell: ShellService
  events: EventBus
  workspace: WorkspaceService
  commands: CommandRegistry
  storage: StorageService
  ui: UIService
}
```

Plugins must NOT directly import internal core modules.

---

# Refactor Command System

Current behavior:

```text id="yc0lcm"
commands self-register inside core
```

This must change.

New behavior:

```text id="o0r8r2"
plugins register commands during activate()
```

---

# Example

Filesystem plugin:

```ts id="1mwj3t"
activate(ctx) {
  ctx.commands.register(openCommand)
  ctx.commands.register(copyCommand)
  ctx.commands.register(moveCommand)
}
```

---

# Required Plugin Breakdown

## Filesystem Plugin

Move:

* open
* copy
* move
* delete
* search

out of core.

---

## Git Plugin

Move:

* /git

out of core.

---

## AI Plugin

Move:

* /ai
* /agent
* MCP tools

out of core.

---

## Browser Plugin

Move:

* /browser

out of core.

---

## Task Plugin

Move:

* /task

out of core.

---

# Plugin Loader

Implement plugin loading system.

Initially:

* statically loaded plugins are acceptable
* dynamic runtime loading is NOT required yet

Example:

```ts id="i6tz81"
loadPlugin(filesystemPlugin)
loadPlugin(aiPlugin)
```

Dynamic loading can come later.

---

# Event System Refactor

Plugins should communicate through events.

Avoid:

* direct cross-plugin imports
* tight coupling

Core should expose:

* event emitter
* event subscription API

---

# UI Refactor

Feature-specific UI should move into plugins where possible.

Examples:

* task panel
* browser preview
* AI panels

Core UI should only provide:

* layout primitives
* rendering containers
* workspace slots

---

# Important Constraints

## DO NOT:

* break existing commands
* change keyboard behavior
* change terminal behavior
* redesign the UI
* rewrite PTY integration

---

# Backward Compatibility

All existing workflows must continue working:

```text id="w5ty2r"
/open
/git
/browser
/task
/ai
npm install
python
vim
```

Behavior should remain identical after refactor.

---

# Refactor Priority

## Phase 1

* plugin interfaces
* plugin runtime
* plugin loader
* command registration migration

## Phase 2

* move existing features into plugins
* remove tight coupling
* isolate dependencies

## Phase 3

* stabilize APIs
* bug fixing
* improve plugin boundaries
* reduce core responsibilities

---

# Success Criteria

The refactor is successful if:

* removing a plugin does NOT break the application
* core does NOT know feature-specific logic
* plugins can be enabled/disabled independently
* commands come from plugins
* the shell/runtime continues functioning normally

---

# Final Goal

Transform the application into:

# a minimal terminal workspace runtime

with

# isolated feature plugins

This creates a stable foundation for:

* future extensions
* AI tools
* local LLM integrations
* plugin marketplace
* autonomous agents
* long-term maintainability
