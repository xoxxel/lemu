# Keyboard-First UX Improvements for Terminal Workspace

## Goal

Improve the command input UX to behave more like a REAL terminal environment.

This application is keyboard-first.

The user should almost never need to use the mouse.

The interaction model should feel similar to:

* terminal history navigation
* shell autocomplete
* command palettes
* vim-like workflows
* Cursor / Claude Code command UX

---

# Problem 1 — Slash Command Selection

## Current Behavior

When the user types:

```text id="0m3u2n"
/
```

A command list appears.

The user can navigate with arrow keys.

BUT:

Pressing `Enter` immediately submits the message.

This is incorrect UX.

---

# Required Behavior

When a slash command menu is open:

```text id="6fgp4u"
/open
/copy
/delete
```

Arrow keys should:

* move selection
* highlight active item

Pressing `Enter` should:

* SELECT the highlighted command
* INSERT it into the input
* NOT submit the message yet

Example:

```text id="vwjlwm"
/open
```

gets inserted into the input field.

The user then continues typing:

```text id="lktt9z"
/open package.json
```

Only AFTER pressing Enter again should the command execute.

---

# Required Input State Logic

Add explicit input states.

Example:

```ts id="6umq0z"
type InputMode =
  | "normal"
  | "slash-menu-open"
  | "autocomplete"
  | "history-navigation"
```

---

# Required Enter Key Behavior

## If slash menu is open

```text id="9r4nsz"
Enter
```

→ select highlighted command only

DO NOT submit.

---

## If autocomplete menu is open

```text id="r35x5r"
Enter
```

→ accept suggestion only

DO NOT submit.

---

## If no menu is open

```text id="p4eygr"
Enter
```

→ execute command/message

---

# Problem 2 — Terminal-like History Navigation

## Goal

The input bar should behave like a REAL shell terminal.

The user must be able to navigate command history using:

* ArrowUp
* ArrowDown

just like:

* PowerShell
* bash
* zsh
* CMD

---

# Required Behavior

When pressing:

```text id="h5j37u"
ArrowUp
```

Load previous command into input.

Example history:

```text id="bkn9sh"
npm install
git status
/open package.json
```

Pressing ArrowUp repeatedly cycles backward.

---

# ArrowDown

Moves forward in history.

Eventually returns to:

* empty input state

---

# History Requirements

History must include BOTH:

* slash commands
* shell commands

Examples:

```text id="pn0qit"
/open package.json
npm install
git status
/search useEffect
```

---

# Required History Architecture

Create:

```text id="w8rwyo"
src/core/history/
  command-history.ts
  history-navigation.ts
```

---

# Suggested History Structure

```ts id="m5u6d0"
{
  id,
  command,
  timestamp,
  cwd,
  type
}
```

Where:

```ts id="jtnib7"
type =
  | "slash-command"
  | "shell-command"
```

---

# Required Navigation Logic

## ArrowUp

```text id="ocm2a7"
currentIndex--
```

Load previous history entry.

---

## ArrowDown

```text id="yr5r2j"
currentIndex++
```

Load next history entry.

---

# Important UX Rules

## Rule 1

History navigation should NOT execute commands automatically.

It should only populate the input field.

Execution still requires pressing Enter.

---

## Rule 2

Typing after history navigation should create editable input.

Example:

```text id="l4gcag"
git status
```

↓

ArrowUp

↓

edit to:

```text id="b2h7x9"
git status --short
```

---

# Problem 3 — Input Focus Priority

Keyboard interactions must prioritize:

1. slash menu
2. autocomplete
3. history navigation
4. normal execution

Example priority order:

```text id="d7ov9j"
if slashMenuOpen:
   arrows control menu

else if autocompleteOpen:
   arrows control suggestions

else:
   arrows control history
```

---

# Required UX Feel

The application should feel like:

* a real shell
* mixed with command palette UX
* inside a structured workspace

The keyboard interaction should feel natural and fast.

---

# Important Constraint

Do NOT introduce heavy shortcut systems.

The UX should remain:

* keyboard-first
* command-driven
* terminal-like
* minimal

---

# Final Goal

The user should feel:

"I can control everything without leaving the keyboard."

and:

"This behaves like a real terminal, not a web form."
