# lemu — Command Reference

> **Version:** 0.1.0  
> **Total Commands:** 11 (plus 1 built-in terminal manager)  
> **Plugin Architecture:** All commands are owned by plugins registered at startup

---

## Command Listing

| # | Command | Aliases | Plugin | Category |
|---|---------|---------|--------|----------|
| 1 | `/open` | `o`, `cat`, `view` | fs | File Operations |
| 2 | `/copy` | `cp` | fs | File Operations |
| 3 | `/move` | `mv`, `rename` | fs | File Operations |
| 4 | `/delete` | `rm`, `del`, `remove` | fs | File Operations |
| 5 | `/search` | `grep`, `find` | search | Code Search |
| 6 | `/git` | `g` | git | Version Control |
| 7 | `/run` | `exec`, `!` | exec | Shell Execution |
| 8 | `/browser` | `browse`, `preview` | browser | Preview |
| 9 | `/task` | `todo`, `tasks` | task | Task Management |
| 10 | `/ai` | `ask` | ai | AI Integration |
| 11 | `/agent` | `auto`, `workflow` | ai | AI Integration |
| — | `/terminal` | (none) | App.tsx (built-in) | Terminal Management |

---

## 1. `/open`

**Aliases:** `o`, `cat`, `view`  
**Plugin:** fs (`src/plugins/fs/open.ts`)  
**Purpose:** Read a file's contents and display it. Creates an editor tab in the main tab bar.

### Syntax

```
/open <path>
```

- `<path>` — Relative path from workspace root, or absolute path within workspace

### Examples

```
# Open a file from workspace root
/open package.json

# Open with explicit path prefix
/open src/App.tsx

# Open using alias
/o src/components/Sidebar.tsx

# Open using cat alias
/cat README.md
```

### Behavior

1. Sends `GET /api/fs/read?path=<path>` to server
2. Server resolves path relative to `LEMU_WORKSPACE` or `process.cwd()`
3. Server validates path is within workspace (security check)
4. Server reads file content with `fs.readFile(target, 'utf-8')`
5. On success:
   - Message added: `"Opened <path>"`
   - Editor tab created in main tab bar with file content
   - Tab auto-selected (focuses on editor view)
   - Path added to recent files list
6. On failure:
   - Error message shown in message stream

### Expected Output

```
> /open package.json
✓ Opened package.json
  [File content displayed in editor tab]
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No path provided | `/open` | `Usage: /open <filepath>` |
| File does not exist | `/open nonexistent.ts` | `Failed to open nonexistent.ts: ENOENT: no such file or directory...` |
| Path outside workspace | `/open ../../etc/passwd` | `Failed to open ../../etc/passwd: Path outside workspace` |
| Directory instead of file | `/open src` | `Failed to open src: EISDIR: illegal operation on a directory...` |
| Binary file | `/open image.png` | `Failed to open image.png: ...` (encoding error) |

### Autocomplete

- First argument: Lists files/dirs from workspace root via `GET /api/fs/list`
- Subsequent: Filters by prefix, respects directory structure

### Related

- Uses same server endpoint as `/browser` for reading
- Creates editor tabs (see Tab Lifecycle in ARCHITECTURE.md)

---

## 2. `/copy`

**Aliases:** `cp`  
**Plugin:** fs (`src/plugins/fs/copy.ts`)  
**Purpose:** Copy a file or directory from source to destination.

### Syntax

```
/copy <source> <destination>
```

### Examples

```
# Copy a file
/copy src/file.ts src/file.backup.ts

# Copy using alias
/cp package.json package.backup.json

# Copy with directory path
/copy docs/readme.md docs/readme.backup.md
```

### Behavior

1. Sends `POST /api/fs/copy` with `{ src, dest }` body
2. Server resolves both paths relative to workspace root
3. Both paths must be inside workspace (security check)
4. Server uses `fs.copy(srcPath, destPath)` (recursive — works for directories)
5. On success: `"Copied <src> → <dest>"`
6. On failure: `"Failed to copy: <error message>"`

### Expected Output

```
> /copy package.json package.backup.json
✓ Copied package.json → package.backup.json
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| Missing arguments | `/copy` | `Usage: /copy <source> <destination>` |
| Missing destination | `/copy file.ts` | `Usage: /copy <source> <destination>` |
| Source does not exist | `/copy nope.ts dest.ts` | `Failed to copy: ENOENT: no such file or directory...` |
| Destination in subdirectory that doesn't exist | `/copy file.ts sub/nope/file.ts` | `Failed to copy: ENOENT: no such file or directory...` |
| Source is outside workspace | `/copy ../../etc/passwd dest` | `Failed to copy: Path outside workspace` |
| Destination is outside workspace | `/copy file.ts ../../etc/passwd` | `Failed to copy: Path outside workspace` |
| Destination already exists and is a directory | `/copy file.ts existing-dir` | May overwrite silently (fs-extra behavior) |

### Notes

- Uses `fs-extra` which supports recursive copy (directories work)
- Overwrites destination if it exists (no `-f` flag needed)
- No progress indicator for large files

### Autocomplete

- First argument: Lists files from workspace root
- Second argument: Filters files by prefix

---

## 3. `/move`

**Aliases:** `mv`, `rename`  
**Plugin:** fs (`src/plugins/fs/move.ts`)  
**Purpose:** Move or rename a file/directory.

### Syntax

```
/move <source> <destination>
```

### Examples

```
# Rename a file
/move old-name.ts new-name.ts

# Move to subdirectory
/move src/file.ts src/utils/file.ts

# Using alias
/mv temp.log logs/temp.log

# Using rename alias
/rename draft.md final.md
```

### Behavior

1. Sends `POST /api/fs/move` with `{ src, dest }` body
2. Server uses `fs.move(srcPath, destPath)` which handles both rename and move
3. Path validation: both must be inside workspace
4. On success: `"Moved <src> → <dest>"`
5. On failure: `"Failed to move: <error message>"`

### Expected Output

```
> /move temp.md final.md
✓ Moved temp.md → final.md
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| Missing arguments | `/move` | `Usage: /move <source> <destination>` |
| Source does not exist | `/move nope.ts dest.ts` | `Failed to move: ENOENT: no such file or directory...` |
| Destination exists (directory) | `/move file.ts existing-dir/` | Moves into directory (fs-extra behavior) |
| Cross-device move | `/move file.ts /different/fs/dest` | May fail or fall back to copy+delete |
| Path outside workspace | `/move ../../etc/passwd dest` | `Failed to move: Path outside workspace` |

### Autocomplete

- First argument: Lists files from workspace root
- Second argument: Filters files by prefix

---

## 4. `/delete`

**Aliases:** `rm`, `del`, `remove`  
**Plugin:** fs (`src/plugins/fs/delete.ts`)  
**Purpose:** Delete a file or directory. Requires `-f` flag for safety.

### Syntax

```
/delete [-f] <path>
```

- `-f` or `--force` — Required to actually delete. Without it, the command returns a confirmation message.

### Examples

```
# First attempt (safety prompt)
/delete temp.log
# => "Confirm deletion of temp.log? Use /delete -f temp.log to force."

# Force delete
/delete -f temp.log

# Force delete with --force
/delete --force temp.log

# Delete with alias
/rm -f old-file.ts

# Delete directory recursively
/delete -f node_modules
```

### Behavior

1. If neither `-f` nor `--force` in args:
   - Returns error: `"Confirm deletion of <path>? Use /delete -f <path> to force."`
   - `data.needsConfirm = true` (for future UI confirmation dialogs)
2. If `-f` or `--force` present:
   - Strips flag from args
   - Sends `POST /api/fs/delete` with `{ path }`
   - Server uses `fs.remove(target)` (recursive — works for directories)
   - On success: `"Deleted <path>"`
   - On failure: `"Failed to delete: <error message>"`

### Expected Output

```
> /delete -f temp.log
✓ Deleted temp.log
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No path | `/delete` | `Usage: /delete [-f] <path>` |
| No force flag | `/delete foo.txt` | `Confirm deletion of foo.txt? Use /delete -f foo.txt to force.` |
| File does not exist | `/delete -f nope.txt` | `Failed to delete: ENOENT: no such file or directory...` |
| Path outside workspace | `/delete -f ../../etc` | `Failed to delete: Path outside workspace` |
| Permission denied | `/delete -f /protected/file` | `Failed to delete: EACCES: permission denied` |

### Autocomplete

- Excludes flag arguments (`-f`, `--force`)
- Lists files from workspace root
- Filters by prefix

### Safety

The `-f` requirement is a deliberate safety measure to prevent accidental deletion. There is no undo.

---

## 5. `/search`

**Aliases:** `grep`, `find`  
**Plugin:** search (`src/plugins/search/search.ts`)  
**Purpose:** Search file contents for a text pattern across the workspace.

### Syntax

```
/search <pattern> [directory]
```

- `<pattern>` — Literal text to search for (not regex despite `/grep` alias)
- `[directory]` — Optional subdirectory to scope the search

### Examples

```
# Basic search
/search React

# Search in specific directory
/search useState src/components

# Search using alias
/grep function

# Find in subdirectory
/find TODO src
```

### Behavior

1. Sends `GET /api/fs/search?pattern=<pattern>&dir=<dir>` to server
2. Server resolves directory relative to workspace
3. Server walks directory recursively (excluding `.`-prefixed dirs and `node_modules`)
4. Only searches files with extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`
5. Uses `String.includes()` for pattern matching (exact substring, not regex)
6. On success:
   - If results found: `"Found N result(s) for \"<pattern>\""` + results inline
   - If no results: `"No results for \"<pattern>\""`

### Search Output Format

```
> /search useState
✓ Found 3 result(s) for "useState"
  src/App.tsx:42    const [value, setValue] = useState('');
  src/components/Sidebar.tsx:15  import { useState } from 'react';
  src/hooks/useToggle.ts:8  export function useToggle(initial = false) {
```

Results show: `filepath:line_number    content`

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No pattern | `/search` | `Usage: /search <pattern> [directory]` |
| Directory outside workspace | `/search foo ../../etc` | `Search failed: Path outside workspace` |
| Pattern not found | `/search xyzzy123` | `No results for "xyzzy123"` |
| Directory does not exist | `/search foo nonexistent-dir` | `Search failed: ENOENT: no such file or directory...` |

### Limitations

- Pattern matching is case-sensitive substring (`String.includes()`)
- Not regex — despite the `/grep` alias name
- File extensions are hardcoded: `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`
- Skips hidden directories (starting with `.`) and `node_modules`
- Large workspaces may be slow (no indexing; full directory walk on each search)

### Autocomplete

- No autocomplete for pattern
- Suggests `.` for directory argument

---

## 6. `/git`

**Aliases:** `g`  
**Plugin:** git (`src/plugins/git/git.ts`)  
**Purpose:** Run git commands and see their output.

### Syntax

```
/git <subcommand> [args...]
```

### Examples

```
/git status
/git add .
/git commit -m "fix: resolve issue"
/git push origin main
/git pull
/git branch
/git checkout -b feature/new-thing
/git log --oneline -5
/git diff
/git stash
/git merge feature-branch

# Using alias
/g status
/g commit -m "wip"
```

### Behavior

1. Prepends `git` to the provided arguments
2. Sends `POST /api/shell/exec` with `{ command: "git <args>" }`
3. Server executes via `execSync(command)` in workspace directory
4. On success (exit code 0): returns stdout content
5. On failure (exit code != 0): returns stderr content with exit code

### Expected Output

```
> /git status
✓ On branch main
  Your branch is up to date with 'origin/main'.

  nothing to commit, working tree clean

> /git add -A
✓ (no output — silent success)
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No subcommand | `/git` | `Usage: /git <subcommand> [args...]` |
| Not a git repository | `/git status` | `git failed: fatal: not a git repository...` |
| Git not installed | `/git status` | `git failed: ...` |
| Invalid subcommand | `/git xyzzy` | `git: 'xyzzy' is not a git command. See 'git --help'.` |

### Autocomplete

Suggests git subcommands: `status`, `add`, `commit`, `push`, `pull`, `branch`, `checkout`, `log`, `diff`, `merge`, `clone`, `stash`, `tag`, `fetch`, `rebase`

### Limitations

- Uses `execSync` (blocking on server) — long git operations will block the server
- Non-interactive — cannot handle prompts (merge conflicts, credential prompts, etc.)
- Output is returned all at once, not streamed
- For interactive git, use the shell command (no `/` prefix) with a terminal session

---

## 7. `/run`

**Aliases:** `exec`, `!`  
**Plugin:** exec (`src/plugins/exec/run.ts`)  
**Purpose:** Execute a shell command non-interactively and see its output.

### Syntax

```
/run <command>
!<command>          (shorthand using ! prefix)
```

### Examples

```
# Run npm command
/run npm test

# List files
/run ls -la

# Using shorthand
!npm run build

# Multi-word command
/run echo "hello world"

# Chained commands
/run npm install && npm run build
```

### Behavior

1. Joins all args into a command string: `args.join(' ')`
2. Sends `POST /api/shell/exec` with `{ command }`
3. Server executes via `execSync(command, { shell, cwd, maxBuffer: 10MB })`
4. Shell is `powershell.exe` on Windows, `/bin/bash` on Unix
5. On exit code 0: success with stdout
6. On non-zero exit: success=false with stderr

### Expected Output

```
> /run node -e "console.log('hi')"
✓ hi

> /run npm test
✓ > app@1.0.0 test
  > jest
  
  PASS  src/test.test.ts
  ...
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| Empty command | `/run` | Returns empty output or error depending on shell |
| Command not found | `/run xyzzy` | `Command failed: ... 'xyzzy' is not recognized...` |
| Command crashes | `/run node -e "throw Error('boom')"` | Shows stderr with stack trace, success=false |

### Key Difference from Shell Commands

| Aspect | `/run` (slash) | Plain `npm test` (shell) |
|--------|---------------|--------------------------|
| Execution | `execSync` (non-interactive) | PTY (interactive) |
| Output | Returned all at once | Streamed live |
| Terminal session | Not needed | Requires PTY session |
| Interactive apps | No (vim, python REPL won't work) | Yes |
| xterm.js display | No (message block only) | Yes (terminal panel) |

### Autocomplete

Suggests common commands: `npm`, `git`, `node`, `ls`, `cat`

### Related

- `!<command>` syntax is parsed by the parser as shorthand for `/run <command>`
- For interactive commands, omit the `/` and type directly

---

## 8. `/browser`

**Aliases:** `browse`, `preview`  
**Plugin:** browser (`src/plugins/browser/browser.ts`)  
**Purpose:** Preview an HTML file in an embedded iframe within the workspace.

### Syntax

```
/browser <filepath>
```

### Examples

```
/browser index.html
/browser docs/api.html

# Using alias
/browse dist/index.html
/preview build/report.html
```

### Behavior

1. Reads file via `GET /api/fs/read?path=<path>`
2. On success: returns `data: { type: 'browser', path, content }` where `content` is the raw HTML
3. Workspace renders an iframe with `srcDoc={content}` and `sandbox="allow-scripts"`
4. Preview appears in message stream as a rendered iframe

### Expected Output

```
> /browser index.html
✓ Previewing index.html
  [───────────────]
  |  Hello World |
  |  Rendered    |
  |  HTML page   |
  [───────────────]
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No path | `/browser` | `Usage: /browser <filepath>` |
| File not found | `/browser nope.html` | `Cannot preview nope.html: ENOENT...` |
| Not an HTML file | `/browser script.js` | Still works (reads raw content) but iframe renders as text |
| File outside workspace | `/browser ../../etc/passwd` | `Cannot preview ...: Path outside workspace` |

### Limitations

- Default path is `index.html` (when no args given after validation — though validate requires args, the execute falls back to `'index.html'`)
- iframe is sandboxed: `allow-scripts` only (no forms, no same-origin, no navigation)
- Height is fixed at 400px
- Static preview only — no hot-reload or dev server integration

### Autocomplete

- Filters file list to `.html` extension only
- Lists from workspace root

---

## 9. `/task`

**Aliases:** `todo`, `tasks`  
**Plugin:** task (`src/plugins/task/task.ts`)  
**Purpose:** Manage an in-memory task list (list, add, complete, remove).

### Syntax

```
/task list
/task add <description>
/task done <id>
/task remove <id>

# Aliases
/todo add "Finish documentation"
/tasks
```

### Subcommands

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `list` | `/task list` | List all tasks with status |
| `add` | `/task add <description>` | Add a new pending task |
| `done` | `/task done <id>` | Mark a task as completed |
| `remove` | `/task remove <id>` | Remove a task entirely |

### Examples

```
# List (also works without subcommand)
/task
/task list
/todo

# Add
/task add Refactor the parser module
/todo add Write tests

# Complete
/task done 1712345678901

# Remove
/task remove 1712345678901
/todo rm 1712345678901
```

### Expected Output

```
> /task add Fix login bug
✓ Task added: Fix login bug

> /task list
✓ Tasks:
  [ ] 1712345678901: Fix login bug

> /task done 1712345678901
✓ Task completed: Fix login bug

> /task list
✓ Tasks:
  [x] 1712345678901: Fix login bug
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| Missing subcommand | `/task` | Lists all tasks (defaults to `list`) |
| Unknown subcommand | `/task fly` | `Unknown subcommand: fly...` |
| Add without description | `/task add` | `Usage: /task add <description>` |
| Done with invalid ID | `/task done 999` | `Task not found: 999` |
| Remove with invalid ID | `/task remove 999` | `Task not found: 999` |

### Limitations

- Tasks are in-memory only — lost on page refresh (no persistence)
- Task IDs are Unix timestamps (from `Date.now()`)
- `done` and `remove` accept either full ID or description prefix
- No due dates, priorities, or categories

### Autocomplete

- First argument: `list`, `add`, `done`, `remove`
- For `done`/`remove`: suggests task IDs of non-completed tasks

---

## 10. `/ai`

**Aliases:** `ask`  
**Plugin:** ai (`src/plugins/ai/ai-cmd.ts`)  
**Purpose:** Ask an AI assistant about the workspace. Requires API key configuration.

### Syntax

```
/ai <question>
/ai config <key=value>
```

### Configuration

Before using `/ai`, configure with an API key:

```
/ai config apiKey=sk-your-key-here
```

Optional config parameters:
```
/ai config apiKey=sk-...,endpoint=https://api.openai.com/v1,model=gpt-4
```

### Examples

```
# Ask a question
/ai What does the parser module do?

/ai Explain how the plugin system works

/ai Find all places where we handle errors

# Using alias
/ask How is the runtime initialized?

# Configuration
/ai config apiKey=sk-abc123
/ai config apiKey=sk-abc123,model=gpt-4
/ai config apiKey=sk-abc123,endpoint=https://my-proxy.com/v1
```

### Behavior

1. If first arg is `config`:
   - Parses comma-separated `key=value` pairs
   - Calls `configureAI(config)` which creates an AI provider
   - If `apiKey` is provided, provider is initialized
2. Otherwise:
   - Joins all args as a question
   - Dynamically imports `core/ai` module (code-split, loaded on first use)
   - Calls `askAI(question)` which:
     - Retrieves or creates AI provider
     - Builds context messages (system prompt + user question)
     - Sends to OpenAI-compatible chat completion API
     - Returns AI's text response

### Expected Output

```
> /ai What is the project structure?
✓ The project has two main parts:
  - server/ (Express + WebSocket + PTY)
  - src/ (React frontend with plugin system)
  
  The source code is organized into:
  - core/ (parser, runtime, AI, events, etc.)
  - plugins/ (fs, search, git, task, exec, browser, ai)
  - components/ (Workspace, Sidebar, InputBar, etc.)
  - hooks/ (useTerminal, useAutocomplete, etc.)
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No question | `/ai` | `Usage: /ai <question> or /ai config <key=value>` |
| Not configured | `/ai hi` | `AI error: No API key configured...` |
| Config without key | `/ai config` | Returns to usage prompt |
| Config with empty key | `/ai config apiKey=` | `Provide an API key: /ai config apiKey=sk-...` |
| Network error | `/ai question` | `AI error: fetch failed...` |
| Invalid endpoint | `/ai config endpoint=bad-url` | `AI error: ...` |

### Notes

- AI module is code-split (lazy loaded via dynamic `import()`)
- Compatible with any OpenAI-compatible API (OpenAI, Ollama, local proxies)
- Supports tool/function calling (used by `/agent`)
- Context includes workspace info, recent commands, available tools

### Autocomplete

- First argument: `config`, `analyze`, `explain`
- After `config`: suggests `apiKey=`, `endpoint=`, `model=`

---

## 11. `/agent`

**Aliases:** `auto`, `workflow`  
**Plugin:** ai (`src/plugins/ai/agent-cmd.ts`)  
**Purpose:** Run an autonomous AI agent that uses tools to complete a task.

### Syntax

```
/agent <task description>
```

### Examples

```
# Fix build issues
/agent fix the build errors

# Analyze project structure
/agent analyze the project architecture

# Refactor code
/agent refactor the parser to use a more functional style

# Using alias
/auto fix the failing tests
/workflow set up a new React component
```

### Behavior

1. Joins all args as a task description
2. Dynamically imports `core/ai` module
3. Calls `runAgent(task)` which:
   - Creates an AI provider (must be configured first via `/ai config`)
   - Builds a system prompt with the task description
   - Enters a loop (max 25 iterations):
     a. Sends conversation + tool definitions to AI
     b. If AI responds with tool calls:
        - Executes each tool (read_file, list_directory, search_files, run_command, etc.)
        - Adds tool result back to conversation
        - Loops
     c. If AI responds with text (no tool calls):
        - Returns the text as final answer
   - If loop hits 25 iterations: returns "max iterations reached"

### Available Agent Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read a file's contents |
| `list_directory` | List files and directories |
| `search_files` | Search for text patterns |
| `run_command` | Execute a shell command |
| `get_workspace_info` | Get workspace name and path |
| `get_file_tree` | Get the file tree (configurable depth) |

### Expected Output

```
> /agent analyze the project structure
✓ # Project Analysis
  The project is a terminal workspace application with:
  
  ## Architecture
  - **Frontend:** React + TypeScript + Vite
  - **Backend:** Express + WebSocket + node-pty
  - **Plugin System:** Runtime with lifecycle hooks
  
  ## Key Directories
  - `src/core/` — Parser, runtime, AI, events, history
  - `src/plugins/` — 7 feature plugins
  - `server/` — HTTP API + WebSocket
  
  [Agent log: 3 tool calls, 2 iterations]
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| No task | `/agent` | `Usage: /agent <task description>` |
| AI not configured | `/agent fix bugs` | `Agent error: No API key configured...` |
| Network error | `/agent do task` | `Agent error: fetch failed...` |
| API rate limited | `/agent ...` | `Agent error: 429 Too Many Requests` |

### Notes

- AI must be configured first via `/ai config apiKey=sk-...`
- Maximum 25 iterations (hardcoded `MAX_ITERATIONS` in agent.ts)
- Tool calls are logged and included in response
- The agent can read files, search, list directories, run commands
- The agent CAN modify files via `run_command` (e.g., `sed`, `echo >`, etc.)
- No approval step — the agent acts autonomously

### Autocomplete

- Suggests: `fix`, `analyze`, `refactor`

---

## 12. `/terminal`

**Aliases:** None (built-in, not a registered command)  
**Owner:** App.tsx (not a plugin)  
**Purpose:** Manage terminal (PTY) sessions.

### Syntax

```
/terminal list
/terminal new
/terminal close <id>
/terminal switch <id>

# or using create alias
/terminal create
/terminal rm <id>
```

### Subcommands

| Subcommand | Syntax | Description |
|------------|--------|-------------|
| `list` | `/terminal list` | List all terminal sessions |
| `new` | `/terminal new` | Create a new terminal session |
| `close` | `/terminal close <id>` | Close a terminal session |
| `switch` | `/terminal switch <id>` | Switch active terminal session |

### Behavior

- **list**: Shows all sessions with active marker (`*`), label, truncated ID, and cwd
- **new/create**: Sends `create-session` message over WebSocket. Server spawns a new PTY process. Auto-opens terminal panel
- **close/rm**: Sends `destroy-session` message. Kills the PTY process
- **switch**: Sends `switch-session` message. Sets active session for input

### Expected Output

```
> /terminal list
✓ Terminal sessions:
  [*] powershell.exe (pty-1234...) cwd: C:\project

> /terminal new
✓ Creating new terminal session...

> /terminal close pty-5678...
✓ Closed session: pty-5678...
```

### Failure Cases

| Scenario | Input | Error Message |
|----------|-------|---------------|
| Invalid subcommand | `/terminal xyz` | `Usage: /terminal [list\|new\|close <id>\|switch <id>]` |
| Close non-existent | `/terminal close bad-id` | No error (silently fails server-side) |

---

## Input Classification

The parser determines how input is handled:

| Input Pattern | Classification | Handler |
|---------------|---------------|---------|
| `/command args` | Slash command | Runtime execute → registry lookup |
| `!command args` | Shorthand run | Parser converts to `/run command args` |
| `plain text` | Shell command | WebSocket → PTY session |
| `(empty)` | No-op | Ignored |

### Shell Command Behavior

When you type a command without `/` prefix:
1. Creates a terminal session if none exists (lazy via `ensureSession()`)
2. Opens the terminal panel at bottom of screen
3. Sends input to the active PTY session via WebSocket
4. Output streams live into terminal panel (xterm.js)
5. A message block is also created in the workspace showing the command and its output

### Key Difference: `/run` vs Shell Command

| Aspect | `/run npm test` | `npm test` (no prefix) |
|--------|-----------------|----------------------|
| Execution | `execSync` (server, blocking) | PTY (server, non-blocking) |
| Output | Returned all at once | Streamed live |
| Interactive | No | Yes (vim, python, etc.) |
| xterm.js | No | Yes |
| Terminal panel | Not used | Auto-opens |
| Use case | Quick commands, scripts | Interactive work, long-running |

---

## Tab Types

The main tab bar supports these tab types:

| Type | Icon | Created By | Content |
|------|------|------------|---------|
| `editor` | ✎ | `/open` | File content as `<pre>` block |
| `terminal` | ▣ | Terminal sessions | xterm.js (in terminal panel, not main bar) |
| `preview` | ◉ | (future) | Browser/content preview |
| `task` | ■ | `/task` | (future) Task detail view |
| `ai` | ✨ | `/ai` | (future) AI conversation view |

Currently only `editor` tabs are created automatically (via `/open`). Other tab types are defined in the type system but not yet active.

---

## Event Bus Events

| Event | Emitted When | Payload |
|-------|-------------|---------|
| `command:executed` | After any command executes | `{ command, args, result, duration }` |
| `plugin:activated` | After plugin is loaded | `{ id, name }` |
| `plugin:deactivated` | After plugin is unloaded | `{ id }` |
| `runtime:ready` | After all plugins initialized | `{}` |
| `task:ready` | Task plugin ready | `{ status: 'ready' }` |
