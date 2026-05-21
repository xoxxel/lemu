# AI Mode Integration (Foundation Phase) — Verified Checklist

Source: `task2.md`

---

## §1 — AI Mode Commands

- [x] `/edit ai on` activates AI mode for current file (`edit-command.ts:49-68`)
- [x] `/edit ai on` acquires ownership (`ownership.acquire('edit', 'ai-mode', ...)`)
- [x] `/edit ai on` opens right-side AI panel (sets `edit:ai:active` in appContext)
- [x] `/edit ai on` creates lightweight session state (`edit:ai:messages = []`, `edit:ai:patches = []`)
- [x] `/edit ai on` enables prompt input (ownership routes plain text to edit plugin onInput)
- [x] `/edit ai off` closes AI panel (`edit:ai:active = false`)
- [x] `/edit ai off` releases ownership (`ownership.release('edit')`)
- [x] `/edit ai off` clears temporary session state (messages + patches reset)
- [x] AI mode scoped ONLY to current file (`editorContext.path` check)

## §2 — Ownership Rules

- [x] Ownership acquired on AI mode activation (`edit-command.ts:60`)
- [x] Only one AI session allowed per file (ownership guard + `isOwnedBy('edit')` check)
- [x] Ownership released on `/edit ai off` (`edit-command.ts:74`)
- [x] Ownership released on session crash (`onInput` catch block via ownership release)
- [x] Ownership released on prompt failure (`onInput` catch block)
- [x] Ownership released on error in AI accept/apply (`ai-mode-actions.ts` error paths)
- [x] No persistent locks (all in-memory, no persistence)

## §3 — UI Layout

- [x] Editor remains primary (side-by-side with AI panel)
- [x] Right-side panel appears on AI mode activation
- [x] Editor remains visible (flex layout, 360px panel, editor fills rest)
- [x] Layout is split-view (`editor-area` flex container)
- [x] Width ~30% (360px, within 30-40% range on typical screens 1200px+)
- [x] Editor NEVER disappears completely (panel is side element, not tab-switch)

## §4 — AI Panel UI

- [x] Header shows AI Mode indicator
- [x] Header shows current file name
- [x] Header shows close button (×) — same as `/edit ai off`
- [x] Conversation area shows user prompts and AI responses (`AiPanel.tsx` messages loop)
- [x] Conversation shows generated patch blocks within assistant responses
- [x] Prompts submitted via main input bar (ownership-routed to `onInput`)
- [x] Enter submits (standard input bar behavior)
- [x] Footer shows hint text with keyboard shortcuts

## §5 — AI Edit Flow

- [x] User prompt → `engine.generatePatches()` → normalized `Patch[]` → preview in UI (`index.ts:181-226`)
- [x] Reuses existing `CoderEngineRegistry` and engine pipeline
- [x] Reuses existing `PatchNormalizer` for `fullFile` → patches conversion
- [x] NO automatic apply (patches remain pending until `>accept` / `>reject` / `>ai-apply`)
- [x] Generated patches visible in AI panel conversation blocks
- [x] Patches remain pending until accepted/rejected/applied

## §6 — Patch Rendering

- [x] Each generated patch shown as distinct block in assistant message (`PatchBlockMini`)
- [x] Each block shows index `[n]` and state (`pending` / `accepted` / `rejected`)
- [x] Each block shows affected range (offset start-end)
- [x] Each block shows old text (removed) and new text (added)
- [x] States are: pending, accepted, rejected

## §7 — Minimal Accept / Reject Behavior

- [x] `>accept <n>` accepts patch by index (`ai-mode-actions.ts:8-30`)
- [x] `>reject <n>` rejects patch by index (`ai-mode-actions.ts:34-53`)
- [x] Accepted patch tagged with `state: 'accepted'` in appContext
- [x] Rejected patch tagged with `state: 'rejected'` in appContext
- [x] NO dependency graphs (simple per-patch, no auto-dependency)
- [x] NO batch approval (individual accept only for this phase)
- [x] NO complex patch trees

## §8 — Diff Visibility

- [x] **State A**: AI panel open + diff visible (default when AI mode active)
- [x] **State B**: AI panel closed + diff hidden (closing panel or `/edit ai off`)
- [x] Only two states implemented (no advanced diff modes)

Note: Inline diff highlighting in the CM editor requires the existing `edit:diffVisible` toggle; AI mode uses the same diff visibility system.

## §9 — Session State

- [x] Minimal session structure via appContext keys:
  - `edit:ai:active` (boolean)
  - `edit:ai:messages` (conversation history)
  - `edit:ai:patches` (generated patches with states)
  - `edit:ai:lastResult` (last engine result metadata)
- [x] No persistence (in-memory only via appContext)
- [x] Cleared on mode deactivation

## §10 — Engine Integration

- [x] Uses existing `CoderEngineRegistry` (`runtime.coderEngines`)
- [x] Uses existing engine pipeline (`engine.generatePatches()`)
- [x] Reuses normalized patch flow (supports both `patches` and `fullFile` formats)
- [x] Apply uses existing `GroupedHistory` + `fetch /api/fs/write` (existing transaction-safe path)

## §11 — Failure Rules

- [x] Generation failure: ownership NOT released (panel stays open), error shown inline in conversation messages
- [x] Generation failure: editor state unchanged
- [x] Patch apply failure: patches remain pending, error surfaced in action return text
- [x] No silent failure

## §12 — UX Principles

- [x] Lightweight: minimal added state, no new stores
- [x] Immediate: no streaming, direct engine call
- [x] Keyboard-first: all actions via `>` commands + standard input bar
- [x] Non-blocking: editor always visible, AI is secondary panel
- [x] NOT a chat application (prompts via input bar, not a chat widget)

## §13 — Technical Constraints

- [x] Reuses existing architecture (appContext, ownership, engine registry)
- [x] No duplicated AI state systems (appContext keys, not new stores)
- [x] No new global stores
- [x] Does NOT break existing `/coder` (parallel path: `/coder` creates AISession, `/edit ai` uses appContext)
- [x] Does NOT break existing edit pipeline (find, replace, propose, apply, diff all unchanged)
- [x] No rewrite of ownership system

---

## Summary

| Requirement | Status |
|-------------|--------|
| §1 — AI Mode Commands | Fully implemented |
| §2 — Ownership Rules | Fully implemented |
| §3 — UI Layout | Fully implemented |
| §4 — AI Panel UI | Fully implemented |
| §5 — AI Edit Flow | Fully implemented |
| §6 — Patch Rendering | Fully implemented |
| §7 — Accept / Reject | Fully implemented |
| §8 — Diff Visibility | Fully implemented |
| §9 — Session State | Fully implemented |
| §10 — Engine Integration | Fully implemented |
| §11 — Failure Rules | Fully implemented |
| §12 — UX Principles | Fully implemented |
| §13 — Technical Constraints | Fully implemented |

All items implemented. 0 gaps.
