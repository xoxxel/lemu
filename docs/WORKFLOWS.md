# lemu — Workflow Examples

> Real-world scenarios demonstrating how to use lemu for common development tasks.

---

## Workflow 1: Open → Edit → Save a File

**Goal:** View a file, understand it, make changes.

### Steps

```
1. Open the file
   > /open src/App.tsx
   → Editor tab appears with file content
   → File path added to sidebar Recent Files

2. Read the content in the editor tab
   → Tab shows full file content as a <pre> block
   → Scroll through the file

3. Make edits using a terminal command
   > sed -i 's/oldText/newText/g' src/App.tsx
   → Shell command runs in terminal panel
   → File is modified on disk

4. Re-open to verify changes
   > /open src/App.tsx
   → Editor tab shows updated content
   → Note: this creates a NEW tab (existing tab is NOT refreshed)
```

### Expected Behavior

- `/open` creates a new editor tab each time
- Tab content is a snapshot at time of open
- No file-watching — tabs do not auto-refresh
- Use `/git diff` or `/run cat src/App.tsx` to check for disk changes

### Known Limitation

Tabs are read-only previews. There is no in-editor file editing. Use shell commands (`sed`, `echo`, `fs-extra` via scripts) or an external editor.

---

## Workflow 2: Search → Open Result

**Goal:** Find a piece of code and open the file containing it.

### Steps

```
1. Search for a pattern
   > /search handleSubmit
   → Shows all matches with file:line:content

2. Identify the target file from results
   → Results show: src/App.tsx:317

3. Open the file at the relevant line
   > /open src/App.tsx
   → Editor tab opens (you'll need to scroll to find the line)

4. Scroll to find the matching line
   → Use terminal: /run grep -n "handleSubmit" src/App.tsx
   → Use the line number from search results
```

### Expected Behavior

- Search results are clickable in the workspace (cursor changes)
- Clicking does NOT navigate to line (no line-jump feature)
- Open file and manually scroll to line

### Tips

- Use `/run grep -n <pattern> <file>` to get line numbers
- Open multiple files in multiple editor tabs
- Use shell commands for navigation: `/run head -n 320 src/App.tsx | tail -n 10`

---

## Workflow 3: Run Git Commands

**Goal:** Use git through lemu's interface.

### Steps

```
1. Check repository status
   > /git status
   → Shows branch, staged/unstaged changes

2. Stage files
   > /git add src/App.tsx
   → Silent success

3. Create a commit
   > /git commit -m "feat: add new feature"
   → Shows commit hash and summary

4. Push to remote
   > /git push origin main
   → Shows push progress

5. View recent history
   > /git log --oneline -5
   → Shows last 5 commits
```

### Interactive Git Alternative

For git operations that need interaction (merge conflict resolution, credential prompts):

```
1. Type git command directly (no / prefix)
   > git merge feature-branch
   → Opens in terminal panel (xterm.js)
   → Interactive if conflict occurs
```

### Expected Behavior

- `/git` commands use `execSync` (non-interactive, results all at once)
- Plain `git` commands use PTY (interactive, streamed)
- Use shell commands (no `/`) for: merge, rebase, interactive add, credential prompts

---

## Workflow 4: Start Dev Server

**Goal:** Run a development server and keep it running while using the workspace.

### Steps

```
1. Start the dev server in the terminal panel
   > npm run dev
   → Terminal session created automatically (if none exists)
   → Terminal panel opens at bottom
   → Server output streams live in xterm.js
   → Workspace also shows a collapsible TerminalBlock with output

2. While server runs, use other commands
   > /git status
   → Message appears in workspace above terminal panel
   → Server continues running in terminal panel

3. Open a file to inspect it
   > /open src/App.tsx
   → Editor tab opens above terminal panel
   → Server still running below

4. Check server output
   → Terminal panel shows latest logs
   → Scroll up in terminal panel to see history
```

### Expected Behavior

- Terminal panel sits between workspace content and input bar
- Panel is collapsible (toggle button on right side of terminal tab bar)
- Multiple sessions can run simultaneously (one visible at a time)
- Long-running processes continue in background when you use other features

### Tips

- Create named terminal sessions with `/terminal new`
- Switch between sessions with `/terminal switch <id>`
- Use different sessions for: dev server, git operations, file operations

---

## Workflow 5: Open Browser Preview

**Goal:** Preview an HTML file in the workspace.

### Steps

```
1. Create or locate an HTML file
   > /run echo "<h1>Hello</h1>" > preview.html

2. Preview it
   > /browser preview.html
   → Message appears with "Previewing preview.html"
   → Embedded iframe renders the HTML below the message

3. Update and re-preview
   > /run echo "<h1>Updated</h1>" > preview.html
   > /browser preview.html
   → New preview message with updated content
```

### Expected Behavior

- Preview appears as an iframe in the message stream
- Frame is sandboxed (scripts run, but no same-origin access)
- Height is fixed at 400px
- Refreshing requires re-running `/browser`

### Limitations

- No live reload — re-run command to see changes
- Only static HTML files (no dev server proxy)
- iframe sandbox restricts: forms, top-navigation, same-origin requests

---

## Workflow 6: Create and Manage Tasks

**Goal:** Track work items during a development session.

### Steps

```
1. Add tasks
   > /task add Implement user authentication
   > /task add Write unit tests
   > /task add Update documentation

2. View all tasks
   > /task list
   → Shows: [ ] 1: Implement user authentication
           [ ] 2: Write unit tests
           [ ] 3: Update documentation

3. Complete a task
   > /task done 1
   → Marks "Implement user authentication" as completed

4. Remove a task
   > /task remove 3
   → Removes "Update documentation" from list

5. View updated list
   > /task
   → Shows: [x] 1: Implement user authentication
           [ ] 2: Write unit tests
```

### Expected Behavior

- Tasks are in-memory only (lost on page refresh)
- Task IDs are timestamps (long numbers)
- You can match tasks by description prefix for `done`/`remove`

### Tips

- Use `/todo` alias for faster typing
- Add tasks as you think of them during a session
- Review with `/task list` before ending a session
- Consider taking screenshots or notes for tasks you want to persist

---

## Workflow 7: Copy and Move Files

**Goal:** Organize project files using lemu's file operations.

### Steps

```
1. Copy a file for backup
   > /copy package.json package.json.backup
   → ✓ Copied package.json → package.json.backup

2. Move a file to a subdirectory
   > /move temp.log logs/temp.log
   → ✓ Moved temp.log → logs/temp.log

3. Delete a backup
   > /delete -f package.json.backup
   → ✓ Deleted package.json.backup
```

### Expected Behavior

- Copy works recursively (directories and their contents)
- Move handles both rename and relocate
- Delete requires `-f` flag (safety)
- All operations are synchronous (server blocks until complete)

---

## Workflow 8: AI-Assisted Workflows

**Goal:** Use AI to help with analysis and automation.

### Prerequisites

```
# Configure AI provider (required once per session)
/ai config apiKey=sk-your-key-here
```

### AI Question & Answer

```
# Ask about code
/ai Explain the plugin lifecycle

# Analyze a file
/ai What does the parser module do?

# Get suggestions
/ai How would you improve the error handling?
```

### Autonomous Agent

```
# Automatic fix
/agent fix the TypeScript compilation errors

# Analysis
/agent analyze the project dependencies and suggest updates

# Refactoring
/agent refactor the search command to support regex patterns
```

### Expected Behavior

- AI module is lazy-loaded (first call loads `core/ai` and dependencies)
- Agent runs autonomously with up to 25 tool-calling iterations
- Agent can read files, list directories, search code, run commands
- Agent CAN modify files via shell commands
- No human-in-the-loop approval for agent actions

---

## Workflow 9: Search and Debug

**Goal:** Find bugs or patterns across the codebase.

### Steps

```
1. Search for a pattern
   > /search TODO
   → Shows all TODO comments in the codebase

2. Narrow search to a directory
   > /search FIXME src/components
   → Shows only results in the components directory

3. Open a file from results
   > /open src/components/Sidebar.tsx
   → Opens the file in an editor tab

4. Use git to find when it was introduced
   > /git log --oneline -5 -- src/components/Sidebar.tsx
   → Shows recent commits touching this file
```

---

## Workflow 10: Session Management

**Goal:** Work with multiple terminal sessions.

### Steps

```
1. Check current sessions
   > /terminal list
   → Shows available sessions

2. Create a new session for a specific task
   > /terminal new
   → New PTY session created
   → Terminal panel auto-opens

3. Use first session for dev server
   > npm run dev           (first session active)
   → Server starts in session 1

4. Switch to second session
   > /terminal switch <session-2-id>
   → Session 2 becomes active

5. Do git work in second session
   > git status            (second session active)
   → Git runs in session 2

6. Close an old session
   > /terminal close <old-session-id>
   → Kills the PTY process
```

### Expected Behavior

- Each session is a separate PTY process
- Sessions are isolated (different cwd, history, environment)
- Only one session is active at a time (receives input)
- All sessions continue running in background
- Sessions persist until closed or server restarts

---

## Workflow 11: Find workspace file structure

### Steps

```
1. Basic workspace info
   > /run pwd
   → Shows current workspace directory

2. List files
   # Use the tree API
   > This is only available via server API, not as a user command
   
   # Alternative: use shell
   > ls
   > ls src/
   > ls -la

3. Quick file count
   > /run dir /s /b | find /c /v ""          (Windows)
   > /run find . -type f | wc -l             (Unix)
```

---

## Quick Reference: When to Use What

| Task | Approach |
|------|----------|
| View a file | `/open <path>` |
| Edit a file | Shell commands (`sed`, `echo`, etc.) |
| Search code | `/search <pattern>` |
| Run tests | `/run npm test` or `npm test` |
| Build project | `/run npm run build` |
| Git status | `/git status` |
| Git commit | `/git commit -m "msg"` |
| Interactive git | `git <command>` (no prefix) |
| Start dev server | `npm run dev` (no prefix, uses PTY) |
| Preview HTML | `/browser <file.html>` |
| Track tasks | `/task add <desc>` |
| AI question | `/ai <question>` |
| AI automation | `/agent <task>` |
| Copy file | `/copy <src> <dest>` |
| Move/rename | `/move <src> <dest>` |
| Delete file | `/delete -f <path>` |
| New terminal | `/terminal new` |
| Switch terminal | `/terminal switch <id>` |
| List terminals | `/terminal list` |
| Quick exec | `!command` |
