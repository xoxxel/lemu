# lemu — Getting Started

> A 5-minute guide to understanding and using lemu.

---

## What is lemu?

lemu is a **keyboard-driven terminal workspace** that runs in your browser. It combines:

- A **terminal emulator** (xterm.js) for running shell commands interactively
- A **command system** with slash commands (`/open`, `/search`, `/git`, etc.)
- A **workspace** for viewing files, search results, and task lists
- **AI assistance** with both Q&A and autonomous agent capabilities

---

## Quick Start

### 1. Start the app

```bash
# From the project root:
npm run dev
```

This starts both the backend server (port 3001) and the frontend dev server (Vite).

### 2. Open the app

Navigate to the URL shown in the terminal (typically `http://localhost:5173` or another port).

### 3. You should see

```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │ Welcome Screen                        │
│          │                                       │
│ lemu     │         lemu                          │
│ > cwd    │    terminal workspace                 │
│          │                                       │
│          │  Just type any command to run it       │
│          │  in the shell, or / for commands       │
│          │                                       │
│          ├──────────────────────────────────────┤
│          │ > Type / to browse commands...         │
└──────────┴──────────────────────────────────────┘
```

The input bar at the bottom is already focused — start typing immediately.

---

## First Commands to Try

### Try shell commands directly

Just type any command without a `/` prefix — it runs in a real shell:

```
npm --version
node --version
pwd
ls
```

The first shell command auto-creates a terminal session and opens the terminal panel at the bottom of the screen.

### Try slash commands

Type `/` to open the command menu, then select from available commands:

```
/help            Show available commands (if implemented)
/open package.json    View a file
/search import        Search for code patterns
/git status          Check git status
/task add My task    Create a task
```

### Use the `!` shorthand

```
!echo hello world    Same as /run echo hello world
!node --version
```

---

## Understanding the Layout

```
┌──────────┬─────────────────────────────────────────┐
│ Sidebar  │ Main Tab Bar                             │
│          │  [package.json] [App.tsx]  [README.md]   │
│ lemu     ├─────────────────────────────────────────┤
│ > ~/proj │ Workspace Content                        │
│          │ ┌─────────────────────────────────────┐  │
│ Terminals│ │ Either: welcome screen,             │  │
│   ● term │ │ file content (editor tab),          │  │
│          │ │ or message stream                   │  │
│ Files    │ └─────────────────────────────────────┘  │
│   ◎ src/ ├─────────────────────────────────────────┤
│          │ Terminal Panel (collapsible)              │
│ Tasks    │ [term1] [term2] [+]                  ▼  │
│   2 tasks│ ┌─────────────────────────────────────┐  │
│          │ │ xterm.js interactive terminal       │  │
│          │ └─────────────────────────────────────┘  │
│          ├─────────────────────────────────────────┤
│          │ > Type your command here...              │
└──────────┴─────────────────────────────────────────┘
```

### Areas

| Area | What it does |
|------|-------------|
| **Sidebar** (left) | Shows terminals, open files, recent files, tasks |
| **Main Tab Bar** (top) | Shows editor/preview tabs. Click to switch, × to close |
| **Workspace** (center) | Shows file content, message stream, or welcome screen |
| **Terminal Panel** (bottom) | xterm.js for interactive shell. Collapsible with ▼ button |
| **Input Bar** (bottom) | Type commands here. `/` for slash menu, Enter to submit |

---

## Common Commands Reference

| What you want to do | Type this |
|---------------------|-----------|
| View a file | `/open package.json` |
| Search code | `/search function` |
| Copy a file | `/copy a.txt b.txt` |
| Move/rename | `/move old.ts new.ts` |
| Delete a file | `/delete -f temp.log` |
| Check git status | `/git status` |
| Git commit | `/git commit -m "message"` |
| Run shell command | `/run npm test` or `!npm test` |
| Preview HTML | `/browser index.html` |
| Add a task | `/task add Write docs` |
| List tasks | `/task` or `/task list` |
| Complete a task | `/task done <id>` |
| Ask AI | `/ai What is this project?` (needs config) |
| Run AI agent | `/agent fix the build` (needs config) |
| New terminal | `/terminal new` |
| List terminals | `/terminal list` |
| Switch terminal | `/terminal switch <id>` |

---

## How Input Works

### Three types of input

| Input | Example | What happens |
|-------|---------|-------------|
| **Slash command** | `/open file.ts` | Executed by the internal command system |
| **Shell command** | `npm install` | Sent to a PTY shell (interactive, streamed) |
| **Shorthand exec** | `!ls -la` | Shorthand for `/run ls -la` |

### The slash menu

1. Type `/` anywhere in the input bar
2. A menu appears showing all available commands
3. Continue typing to filter commands (e.g., `/op` shows `/open`)
4. Use **ArrowUp/ArrowDown** to navigate, **Enter** or **Tab** to select
5. **Escape** closes the menu

### Keyboard shortcuts

| Key | What it does |
|-----|-------------|
| Enter | Submit command |
| ArrowUp | Previous command (history) |
| ArrowDown | Next command (history) |
| Tab | Select autocomplete suggestion |
| Escape | Close menu / cancel |

---

## Using the Terminal Panel

The terminal panel is where interactive shell sessions run.

### Open the panel

- Automatically opens when you run a shell command (no `/` prefix)
- Or create a session manually: `/terminal new`

### Use the panel

- Each session has its own tab in the terminal panel
- Click tabs to switch between sessions
- Click the + button to create a new session
- Click × to close a session
- Click the ▼/▲ button on the right to collapse/expand the panel

### When to use shell commands vs `/run`

| Use shell commands (no `/`) when: | Use `/run` or `!` when: |
|----------------------------------|------------------------|
| Running interactive programs (vim, python) | Quick one-off commands |
| Long-running processes (dev server) | Checking output |
| Commands that need live output streaming | Commands with little output |
| Multiple commands in sequence | Non-interactive scripts |

---

## Configuring AI

The AI features require an API key from an OpenAI-compatible provider:

```
/ai config apiKey=sk-your-actual-key
```

Optional settings:
```
/ai config apiKey=sk-key,endpoint=https://api.openai.com/v1,model=gpt-4
```

Once configured:

- `/ai` — Ask questions about the workspace
- `/agent` — Run an autonomous agent for multi-step tasks

---

## Example Workflows

### View and search code

```
/ search import           Find all import statements
/ open src/App.tsx        View the file found
/ search useState src/     Search in a specific directory
```

### Start a dev server while working

```
npm run dev               Starts server in terminal panel (stays running)
/ git status              Check git while server runs
/ open package.json       View config while server runs
```

### Track your work

```
/ task add Fix login bug
/ task add Write tests
/ task list                See all tasks
/ task done 123456...      Mark complete
```

### Manage files

```
/ copy file.ts file.backup.ts
/ move old.ts new.ts
/ delete -f temp.log
```

---

## Tips & Tricks

1. **Command history**: Press ArrowUp to repeat previous commands (works for both slash and shell commands)
2. **Multiple terminals**: Open a terminal for your dev server and another for git commands
3. **Tab management**: Close tabs you don't need with the × button
4. **Quick exec**: Use `!` instead of `/run` — `!npm test` works
5. **Autocomplete**: Type `/` then start typing to filter commands
6. **Collapse terminal**: Click ▼ when you need more workspace space
7. **File operations**: Always use `-f` with `/delete` (safety measure)

---

## Need More Help?

- See `docs/COMMANDS.md` — Full command reference with examples and error cases
- See `docs/WORKFLOWS.md` — Real-world workflow examples
- See `docs/TESTING.md` — QA test scenarios for every feature
- See `docs/ARCHITECTURE.md` — Internal architecture details

### Quick Links

| Document | What's Inside |
|----------|---------------|
| COMMANDS.md | Every command: syntax, aliases, behavior, errors |
| WORKFLOWS.md | 11 end-to-end workflows with step-by-step instructions |
| TESTING.md | 100+ manual test cases organized by feature |
| ARCHITECTURE.md | Plugin system, runtime flow, event lifecycle, tab lifecycle |
