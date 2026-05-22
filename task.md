# Lemu — Final Core Editing, AI Session & UI Integration Phase

## Product Identity

Lemu is a keyboard-first, single-file AI-assisted editor.

It is NOT:

* an autonomous coding agent
* a repo orchestrator
* a multi-file automation system
* an enterprise IDE

The user writes their own code.
AI only suggests changes for the currently active file.
The user always stays in control.

Core priorities:

* speed
* clarity
* reliability
* keyboard-first interaction
* reversible AI assistance

Automation is always secondary to user control.

---

# Core Product Rules (must remain true)

* AI never silently applies changes
* Every AI mutation must be reviewable
* Every AI mutation must be reversible
* One AI session = one file
* No background autonomous actions
* No multi-file planning
* No hidden edits
* No mouse dependency

If a feature violates these principles, reject it.

---

# Scope of This Phase

## In Scope

* AI session lifecycle
* grouped undo/redo semantics
* AI patch review flow
* atomic persistence correctness
* patch approval/rejection commands
* AI side panel
* diff visibility states
* keyboard-first workflow integration
* session-based ownership
* single-file enforcement

## Explicitly Out of Scope

* multi-file orchestration
* autonomous agent loops
* background indexing
* vector memory
* Git dependency
* collaborative editing
* cloud sync
* repo-wide mutation planning
* autonomous code generation systems

---

# 1. AI Session Architecture

Every `/coder` execution creates an `AISession`.

Session contains:

* `sessionId`
* `filePath`
* `originalSnapshot`
* `generatedPatches`
* `patchStates`
* `timestamp`
* `engineMetadata`

Patch states:

* `pending`
* `accepted`
* `rejected`

Session exists only for the active file.

Session ends when:

* all patches resolved
* session closed
* editor disposed
* new session replaces old one

---

# 2. Snapshot Model

Before AI generation:

Capture lightweight in-memory snapshot:

* file content
* cursor position
* selection state (if exists)

Purpose:

* full AI-session revert
* grouped undo
* consistency recovery

This is NOT:

* persistence
* journaling
* long-term history

Keep it lightweight.

---

# 3. Undo / Redo Semantics (Critical)

AI-generated changes must behave as ONE logical transaction.

Required behavior:

* One `>undo`
  reverts the entire accepted AI session.

* One `>redo`
  reapplies the entire session.

Forbidden:

* one undo per patch
* one undo per line
* fragmented AI history
* mixed AI/manual corruption

---

# Manual Edit Edge Case

If:

1. AI session partially applied
2. user manually edits afterward
3. user runs `>undo`

Then:

* manual edits undo first
* THEN AI session reverts as one grouped transaction

This behavior must be deterministic and tested.

---

# 4. AI Apply Pipeline

Final pipeline must be:

AI Engine
→ normalized Patch[]
→ preview in AI panel
→ user approval/rejection
→ grouped transaction
→ atomic write
→ history finalize

NOT:

AI
→ full text replace
→ direct fs write

---

# 5. Persistence Correctness

Atomic write remains mandatory:

write temp
→ fs.rename()

History commit must happen ONLY AFTER successful atomic write.

If write fails:

* rollback editor state
* rollback history transaction
* notify user
* prevent editor/file divergence

No partial success states allowed.

---

# 6. Patch Normalization Contract

Each engine MUST declare:

```ts
outputFormat:
  | 'fullFile'
  | 'unified'
  | 'searchReplace'
```

PatchNormalizer selects normalization strategy ONLY from declared format.

Never guess formats.

Type-level enforcement required.

---

# 7. AI Panel (UI Behavior)

## Purpose

The right-side panel is NOT a generic chat application.

It is:

* AI response stream
* patch review surface
* session inspector

---

## Layout

* Editor remains primary surface
* AI panel opens on RIGHT side
* Editor content must remain visible
* No full-screen takeover
* Keyboard workflow must remain uninterrupted

---

# 8. Diff Visibility States

Three supported states:

## State 1 — Default AI Review

* AI panel open
* diff visible in editor

Purpose:
review + context simultaneously

---

## State 2 — Focused Reading

* AI panel open
* diff hidden

Purpose:
maximize readability while reading AI response

---

## State 3 — Diff Review Only

* AI panel closed
* diff visible

Purpose:
review accepted/rejected modifications without chat surface

---

Existing diff toggle system should be reused.
Do not invent a new UI model.

---

# 9. Patch Presentation

Each AI-generated patch must:

* be visually isolated
* have stable identifier
* expose current state

Example:

```txt
Patch [14]
status: pending
```

Available commands:

```txt
>accept
>reject

>accept 14
>reject 14

>accept all
>reject all

>next patch
>prev patch

>undo
>redo
```

No new command syntax.
Must integrate with existing command architecture.

---

# 10. Patch Dependency Rules

If:

* patch B depends on patch A
* patch A rejected

Then:

* patch B auto-rejects
* user notified clearly

System must prevent invalid partial apply states.

Dependency handling must be deterministic.

---

# 11. Ownership Rules

Ownership behavior:

* acquired at AI session start
* released at session end
* released on ALL error paths
* no long-lived locks

Use strict try/finally semantics.

Ownership only protects:

* concurrent AI mutation
* on the SAME file

Nothing more.

---

# 12. Single-File Enforcement

ALL engines MUST enforce:

* exactly one target file
* no external file mutation
* no automatic file creation

If Aider attempts:

* multi-file mutation
* file creation
* repo traversal

Reject operation immediately.
Surface clear error to user.

---

# 13. Recovery Layer

Keep current lightweight model:

`.lemu/pending.json`

Purpose ONLY:

* unresolved write visibility
* startup warning
* crash diagnostics

DO NOT evolve into:

* journal engine
* persistent transaction DB
* recovery framework

Keep it intentionally simple.

---

# 14. Required Deliverables

After implementation provide FULL report.

---

## A. Architecture Report

Include:

* components added
* contracts changed
* final transaction flow
* AI session flow

---

## B. Undo / Redo Report

Explain:

* grouped history model
* AI transaction boundaries
* revert semantics
* manual-edit-after-AI edge case handling

---

## C. Failure Consistency Report

Explain:

* fs.rename failure behavior
* rollback logic
* history rollback
* consistency guarantees

---

## D. AI Session Report

Include:

* lifecycle
* ownership lifecycle
* snapshot lifecycle
* patch lifecycle
* cleanup behavior

---

## E. Scope Enforcement Report

Explain:

* single-file enforcement
* aider restrictions
* rejected mutation types
* dependency rejection behavior

---

## F. UI Report

Explain:

* final layout
* panel behavior
* diff states
* keyboard interactions
* command mappings

---

## G. Verification

Provide:

* `tsc --noEmit` result
* build result
* tests added
* tested edge cases

Must explicitly test:

* fs write failure rollback
* grouped undo
* manual edits after AI
* patch dependency rejection
* ownership cleanup on crash
* aider multi-file rejection

---

# Hard Constraints

* No silent AI apply
* No multi-file mutation
* No fragmented AI undo history
* No history finalize before successful fs write
* No mouse-only interactions
* No new command syntax
* No enterprise abstractions
* No autonomous behavior

Implementation must preserve:

* simplicity
* determinism
* keyboard-first UX
* user control
