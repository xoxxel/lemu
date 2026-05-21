````text
# Lemu — AI Mode Integration (Foundation Phase)

## Context

Lemu is a keyboard-first, single-file AI-assisted editor.

The user writes code manually.
AI only assists inside the current file.
The system is NOT an autonomous coding agent.

At this phase, focus ONLY on:
- integrating AI mode into the editor flow
- ownership activation
- right-side AI panel
- minimal AI interaction loop
- showing AI-generated edits visually

Do NOT implement advanced workflows yet.

The goal of this phase:
A user can enable AI mode, type prompts, receive edits, preview them, and continue editing — all inside a lightweight keyboard-first workflow.

---

# Scope of This Phase

## IN SCOPE

- `/edit ai on`
- `/edit ai off`
- AI mode ownership activation
- Right-side AI panel UI
- Prompt input inside AI mode
- AI request → edit generation flow
- Diff visualization in editor
- Basic patch rendering
- Accept/reject UI hooks (minimal)
- Session lifecycle
- Keyboard-first interaction
- Preserve editor visibility while AI panel is open

---

## OUT OF SCOPE

DO NOT IMPLEMENT:

- Multi-file support
- Autonomous agent loops
- Background planning
- Complex patch dependency systems
- Streaming
- Chat history persistence
- Tool calling
- Vector memory
- Advanced undo semantics
- Full `/coder` redesign
- Workspace orchestration
- Git integration
- Complex transaction journals

This phase is UI + interaction foundation only.

---

# Required Behavior

## 1. AI Mode Commands

Implement:

```text
/edit ai on
/edit ai off
````

Behavior:

### `/edit ai on`

* activates AI mode for current file
* acquires ownership
* opens right-side AI panel
* creates lightweight AI session state
* enables prompt input

### `/edit ai off`

* closes AI panel
* releases ownership
* clears temporary AI session state
* removes active patch highlights

AI mode is scoped ONLY to the current file.

---

# 2. Ownership Rules

When AI mode activates:

* ownership MUST be acquired
* only one AI session allowed per file
* ownership MUST release on:

  * `/edit ai off`
  * session crash
  * prompt failure
  * component unmount
  * editor close

Use strict try/finally patterns.

No persistent locks.

---

# 3. UI Layout

## General Layout

Editor remains primary.

When AI mode is enabled:

* a right-side panel appears
* editor remains visible
* layout becomes split-view

Structure:

```text
| Editor Area | AI Panel |
```

The editor must NEVER disappear completely.

AI panel width:

* approximately 30–40% of available width
* resizable later (NOT in this phase)

---

# 4. AI Panel UI

Minimal UI only.

Panel contains:

## Header

* AI Mode indicator
* current file name
* active engine name
* close button (same as `/edit ai off`)

## Conversation Area

Shows:

* user prompts
* assistant responses
* generated patch blocks

## Prompt Input

Single input area at bottom:

* keyboard focused when panel opens
* Enter submits
* Shift+Enter newline

---

# 5. AI Edit Flow

Flow:

```text
User prompt
→ engine.generatePatches()
→ normalized Patch[]
→ preview in UI
→ diff highlights appear in editor
```

NO automatic apply.

The editor only previews changes for now.

Generated edits must:

* visually highlight affected ranges
* remain pending until accepted/rejected

---

# 6. Patch Rendering

Each generated patch shown in AI panel as a distinct block.

Each block includes:

```text
[14]
accept
reject
```

or visually equivalent inline actions.

States:

* pending
* accepted
* rejected

Minimal styling is enough for this phase.

No advanced grouping yet.

---

# 7. Minimal Accept / Reject Behavior

Implement minimal interaction only.

Commands:

```text
>accept 14
>reject 14
```

Behavior:

* accepted patch applies to editor state
* rejected patch removes preview

DO NOT implement:

* dependency graphs
* batch approval
* complex patch trees

Those come later.

---

# 8. Diff Visibility

When patches exist:

* editor shows inline diff highlights
* AI panel shows related patch blocks

Implement ONLY two states for now:

## State A

AI panel open + diff visible

## State B

AI panel closed + diff hidden

Do NOT implement advanced diff modes yet.

---

# 9. Session State

Minimal session structure:

```ts
{
  filePath,
  active,
  patches,
  createdAt,
  ownershipId
}
```

No persistence required yet.

Session is in-memory only.

---

# 10. Engine Integration

Use existing `CoderEngineRegistry`.

AI mode should:

* resolve active engine
* use existing engine pipeline
* reuse normalized patch flow

Do NOT create new AI pipelines.

`/edit ai` must internally reuse:

* current engine abstraction
* patch normalization
* transaction-safe apply path

---

# 11. Failure Rules

If generation fails:

* ownership released
* panel remains open
* error shown inline
* editor state unchanged

If patch apply fails:

* patch remains pending
* error shown
* editor content restored

No silent failure.

---

# 12. UX Principles

Must feel:

* lightweight
* immediate
* keyboard-first
* non-blocking

The editor is always primary.
AI is secondary assistance.

Do NOT turn the UI into a chat application.

---

# 13. Technical Constraints

* Reuse existing architecture
* No duplicated AI state systems
* No new global stores unless required
* No breaking current `/coder`
* No breaking current edit pipeline
* No rewrite of ownership system

This phase should layer cleanly on top of the current architecture.

---

# Required Deliverables

After implementation, provide a report covering:

## 1. Architecture

* components added
* state flow
* ownership flow
* AI mode lifecycle

## 2. UI

* final layout
* panel behavior
* diff rendering approach
* keyboard interaction model

## 3. Engine Integration

* how `/edit ai` uses CoderEngine
* how patches are previewed
* how acceptance flows into transaction pipeline

## 4. Failure Handling

* ownership cleanup behavior
* generation failure behavior
* patch apply rollback behavior

## 5. Verification

* TypeScript status
* build status
* tests added
* edge cases tested

---

# Hard Rules

* No auto-apply
* No multi-file editing
* No background agents
* No ownership leaks
* No hidden mutations
* Editor must remain visible
* AI panel must remain secondary
* Everything must remain keyboard-first

```
```
