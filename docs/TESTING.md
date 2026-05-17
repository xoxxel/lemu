# lemu — Testing Guide

> QA-style manual test scenarios for every command and system behavior.

---

## How to Use This Guide

Each test case includes:
- **ID**: Unique identifier for tracking
- **Category**: Feature area
- **Title**: Brief description
- **Prerequisites**: What must be true before testing
- **Steps**: Exact actions to perform
- **Expected Result**: What should happen
- **Result**: [ ] Pass / [ ] Fail / [ ] N/A

---

## T1: Input Parser

### T1.1: Slash command detection
**Prerequisites:** App loaded, input bar focused

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/` in input bar | Slash menu opens showing all registered commands |
| 2 | Type `ope` | Menu filters to commands matching "ope" (should show `/open`) |
| 3 | Press Enter | `/open ` inserted into input, menu closes |
| 4 | Press Enter again | Command submitted (shows usage because no path) |

**Result:** [ ] Pass [ ] Fail

### T1.2: Shell command detection
**Prerequisites:** App loaded, no slash menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `npm install` | No slash menu appears |
| 2 | Press Enter | Terminal session created (if none exists), terminal panel opens, command sent to PTY |
| 3 | Wait 2 seconds | Output appears in terminal panel and workspace message |

**Result:** [ ] Pass [ ] Fail

### T1.3: `!` shorthand detection
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `!ls` | Input shows `!ls`, no slash menu |
| 2 | Press Enter | Treated as `/run ls`, result shown in message stream |

**Result:** [ ] Pass [ ] Fail

### T1.4: Empty input
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Enter with empty input | Nothing happens (no message, no error) |
| 2 | Type spaces and press Enter | Nothing happens (trimmed to empty) |

**Result:** [ ] Pass [ ] Fail

### T1.5: Unknown command
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/xyzzy` and press Enter | Message: `Unknown command: /xyzzy` |

**Result:** [ ] Pass [ ] Fail

---

## T2: `/open` Command

### T2.1: Open existing file
**Prerequisites:** App loaded, file `package.json` exists in workspace

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open package.json` and press Enter | Message: `✓ Opened package.json` |
| 2 | Check main tab bar | Editor tab with label `package.json` appears |
| 3 | Check workspace | File content visible in editor pane |
| 4 | Check sidebar | `package.json` appears in Open Files section |

**Result:** [ ] Pass [ ] Fail

### T2.2: Open with alias `o`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/o src/App.tsx` and press Enter | Same behavior as T2.1 |

**Result:** [ ] Pass [ ] Fail

### T2.3: Open with alias `view`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/view README.md` and press Enter | Same behavior as T2.1 |

**Result:** [ ] Pass [ ] Fail

### T2.4: Open non-existent file
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open nonexistent-file.ts` and press Enter | Message: `Failed to open nonexistent-file.ts: ENOENT: no such file or directory...` |
| 2 | Check tabs | No new tab created |

**Result:** [ ] Pass [ ] Fail

### T2.5: Open with no path
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open` and press Enter | Message: `Usage: /open <filepath>` |

**Result:** [ ] Pass [ ] Fail

### T2.6: Open directory
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open src` and press Enter | Error: cannot read a directory |

**Result:** [ ] Pass [ ] Fail

### T2.7: Open with relative path (./ prefix)
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open ./package.json` and press Enter | File opens successfully |

**Result:** [ ] Pass [ ] Fail

### T2.8: Open with subdirectory path
**Prerequisites:** App loaded, file exists in subdirectory

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open src/components/Sidebar.tsx` and press Enter | File opens successfully |

**Result:** [ ] Pass [ ] Fail

### T2.9: Open binary file
**Prerequisites:** Binary file exists (e.g., `favicon.ico`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open favicon.ico` and press Enter | May show garbled content or error (depends on fs.readFile behavior) |

**Result:** [ ] Pass [ ] Fail

### T2.10: Open large file
**Prerequisites:** Large file exists (>1MB)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a large file (e.g., `package-lock.json`) | File loads, may lag rendering depending on size |

**Result:** [ ] Pass [ ] Fail

### T2.11: Path traversal attempt
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open ../../etc/passwd` and press Enter | Message: `Failed to open ... Path outside workspace` |

**Result:** [ ] Pass [ ] Fail

### T2.12: Multiple opens create multiple tabs
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Run `/open package.json` | First tab created |
| 2 | Run `/open src/App.tsx` | Second tab created, App.tsx is active |
| 3 | Run `/open README.md` | Third tab created, README.md is active |
| 4 | Click first tab in main tab bar | package.json tab becomes active, shows its content |

**Result:** [ ] Pass [ ] Fail

---

## T3: `/copy` Command

### T3.1: Copy file to new file
**Prerequisites:** `test.txt` exists, `test.copy.txt` does NOT exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy test.txt test.copy.txt` and press Enter | Message: `✓ Copied test.txt → test.copy.txt` |
| 2 | Verify file exists | `test.copy.txt` exists with same content |

**Result:** [ ] Pass [ ] Fail

### T3.2: Copy file with alias `cp`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/cp a.txt b.txt` and press Enter | Same as T3.1 |

**Result:** [ ] Pass [ ] Fail

### T3.3: Copy directory recursively
**Prerequisites:** `testdir/` exists with contents

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy testdir testdir-backup` and press Enter | Directory copied with all contents (fs-extra recursive copy) |

**Result:** [ ] Pass [ ] Fail

### T3.4: Copy with missing arguments
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy` and press Enter | `Usage: /copy <source> <destination>` |
| 2 | Type `/copy file.ts` and press Enter | `Usage: /copy <source> <destination>` |

**Result:** [ ] Pass [ ] Fail

### T3.5: Copy non-existent source
**Prerequisites:** `nope.txt` does NOT exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy nope.txt dest.txt` and press Enter | Error: source not found |

**Result:** [ ] Pass [ ] Fail

### T3.6: Copy to path outside workspace
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy package.json ../../etc/x.json` and press Enter | Error: Path outside workspace |

**Result:** [ ] Pass [ ] Fail

### T3.7: Copy overwrites existing
**Prerequisites:** `dest.txt` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/copy package.json dest.txt` and press Enter | File is overwritten silently (fs-extra behavior) |

**Result:** [ ] Pass [ ] Fail

---

## T4: `/move` Command

### T4.1: Move/rename file
**Prerequisites:** `old.txt` exists, `new.txt` does NOT exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/move old.txt new.txt` and press Enter | Message: `✓ Moved old.txt → new.txt` |
| 2 | Verify | `old.txt` gone, `new.txt` exists with same content |

**Result:** [ ] Pass [ ] Fail

### T4.2: Move with alias `mv`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/mv a.ts b.ts` and press Enter | Same as T4.1 |

**Result:** [ ] Pass [ ] Fail

### T4.3: Move with alias `rename`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/rename draft.md final.md` and press Enter | Same as T4.1 |

**Result:** [ ] Pass [ ] Fail

### T4.4: Move to subdirectory
**Prerequisites:** `logs/` directory exists, `temp.log` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/move temp.log logs/temp.log` and press Enter | File moved into logs/ |

**Result:** [ ] Pass [ ] Fail

### T4.5: Move with missing arguments
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/move` and press Enter | `Usage: /move <source> <destination>` |
| 2 | Type `/move file.ts` and press Enter | `Usage: /move <source> <destination>` |

**Result:** [ ] Pass [ ] Fail

### T4.6: Move non-existent source
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/move nope.txt dest.txt` and press Enter | Error: source not found |

**Result:** [ ] Pass [ ] Fail

---

## T5: `/delete` Command

### T5.1: Delete requires force flag
**Prerequisites:** File `temp.txt` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete temp.txt` and press Enter | Message: `Confirm deletion of temp.txt? Use /delete -f temp.txt to force.` |
| 2 | Verify file still exists | `temp.txt` is NOT deleted |

**Result:** [ ] Pass [ ] Fail

### T5.2: Force delete file
**Prerequisites:** File `temp.txt` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete -f temp.txt` and press Enter | Message: `✓ Deleted temp.txt` |
| 2 | Verify file | `temp.txt` no longer exists |

**Result:** [ ] Pass [ ] Fail

### T5.3: Force delete with `--force`
**Prerequisites:** File `temp.txt` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete --force temp.txt` and press Enter | Same as T5.2 |

**Result:** [ ] Pass [ ] Fail

### T5.4: Delete with alias `rm`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/rm -f test.txt` and press Enter | File deleted |

**Result:** [ ] Pass [ ] Fail

### T5.5: Delete with alias `del`
**Prerequisites:** File exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/del -f test.txt` and press Enter | File deleted |

**Result:** [ ] Pass [ ] Fail

### T5.6: Delete non-existent file
**Prerequisites:** `nope.txt` does NOT exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete -f nope.txt` and press Enter | Error: file not found |

**Result:** [ ] Pass [ ] Fail

### T5.7: Delete with no path
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete` and press Enter | `Usage: /delete [-f] <path>` |
| 2 | Type `/delete -f` and press Enter | `Usage: /delete [-f] <path>` (no path after stripping flags) |

**Result:** [ ] Pass [ ] Fail

### T5.8: Delete directory recursively
**Prerequisites:** `testdir/` exists with contents

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/delete -f testdir` and press Enter | Directory and all contents deleted |

**Result:** [ ] Pass [ ] Fail

---

## T6: `/search` Command

### T6.1: Search for existing pattern
**Prerequisites:** Codebase contains the word "function"

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/search function` and press Enter | Message: `✓ Found N result(s) for "function"` with matching lines |

**Result:** [ ] Pass [ ] Fail

### T6.2: Search with no results
**Prerequisites:** Pattern does not exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/search xyzzy_nonexistent_12345` and press Enter | Message: `No results for "xyzzy_nonexistent_12345"` |

**Result:** [ ] Pass [ ] Fail

### T6.3: Search with no pattern
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/search` and press Enter | `Usage: /search <pattern> [directory]` |

**Result:** [ ] Pass [ ] Fail

### T6.4: Search with alias `grep`
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/grep import` and press Enter | Same as T6.1 with pattern "import" |

**Result:** [ ] Pass [ ] Fail

### T6.5: Search with alias `find`
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/find React` and press Enter | Same as T6.1 |

**Result:** [ ] Pass [ ] Fail

### T6.6: Search in specific directory
**Prerequisites:** `src/components` directory exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/search export default src/components` and press Enter | Results only from `src/components/` directory |

**Result:** [ ] Pass [ ] Fail

### T6.7: Search is case-sensitive
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for `Import` (capital I) | May differ from `import` (lowercase) — server uses `String.includes()` which is case-sensitive |

**Result:** [ ] Pass [ ] Fail

### T6.8: Search skips node_modules
**Prerequisites:** `node_modules` directory exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for a pattern known to exist in node_modules | Results should NOT include node_modules files |

**Result:** [ ] Pass [ ] Fail

### T6.9: Search file extension filtering
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for a pattern that exists in a `.txt` file | `.txt` files are NOT searched (only `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.md`, `.css`, `.html`) |

**Result:** [ ] Pass [ ] Fail

---

## T7: `/git` Command

### T7.1: Check git status
**Prerequisites:** Workspace is a git repository

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git status` and press Enter | Shows git status output (branch, changes) |

**Result:** [ ] Pass [ ] Fail

### T7.2: Git add and commit
**Prerequisites:** Working tree has changes

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git add -A` and press Enter | Silent success |
| 2 | Type `/git commit -m "test commit"` and press Enter | Commit created with hash |

**Result:** [ ] Pass [ ] Fail

### T7.3: Git log
**Prerequisites:** Repository has commits

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git log --oneline -3` and press Enter | Shows last 3 commits |

**Result:** [ ] Pass [ ] Fail

### T7.4: Git with alias `g`
**Prerequisites:** Git repo

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/g status` and press Enter | Same as `/git status` |

**Result:** [ ] Pass [ ] Fail

### T7.5: Git without subcommand
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git` and press Enter | `Usage: /git <subcommand> [args...]` |

**Result:** [ ] Pass [ ] Fail

### T7.6: Git in non-repo directory
**Prerequisites:** Workspace is NOT a git repository

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git status` and press Enter | Error: fatal: not a git repository |

**Result:** [ ] Pass [ ] Fail

### T7.7: Git diff
**Prerequisites:** Uncommitted changes exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/git diff` and press Enter | Shows diff of unstaged changes |

**Result:** [ ] Pass [ ] Fail

---

## T8: `/run` Command

### T8.1: Run simple command
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/run echo hello` and press Enter | Message: `hello` (stdout) |

**Result:** [ ] Pass [ ] Fail

### T8.2: Run with alias `!`
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `!echo hello` and press Enter | Same as T8.1 |

**Result:** [ ] Pass [ ] Fail

### T8.3: Run failing command
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/run exit 1` and press Enter | Error message with stderr or exit code (depends on shell) |

**Result:** [ ] Pass [ ] Fail

### T8.4: Run with no args
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/run` and press Enter | Empty command — may show shell error or no output |

**Result:** [ ] Pass [ ] Fail

### T8.5: Run npm command
**Prerequisites:** `package.json` exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/run npm --version` and press Enter | Shows npm version |

**Result:** [ ] Pass [ ] Fail

---

## T9: `/browser` Command

### T9.1: Preview existing HTML file
**Prerequisites:** `test.html` exists with basic HTML content

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/browser test.html` and press Enter | Message: `✓ Previewing test.html` |
| 2 | Check workspace | Embedded iframe renders the HTML |

**Result:** [ ] Pass [ ] Fail

### T9.2: Preview with alias `browse`
**Prerequisites:** HTML file exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/browse test.html` and press Enter | Same as T9.1 |

**Result:** [ ] Pass [ ] Fail

### T9.3: Preview with alias `preview`
**Prerequisites:** HTML file exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/preview test.html` and press Enter | Same as T9.1 |

**Result:** [ ] Pass [ ] Fail

### T9.4: Preview non-existent file
**Prerequisites:** `nope.html` does NOT exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/browser nope.html` and press Enter | Error: Cannot preview nope.html |

**Result:** [ ] Pass [ ] Fail

### T9.5: Preview with no path
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/browser` and press Enter | `Usage: /browser <filepath>` |

**Result:** [ ] Pass [ ] Fail

### T9.6: iframe sandbox behavior
**Prerequisites:** HTML file exists that tries to access `top` or submit forms

| Step | Action | Expected |
|------|--------|----------|
| 1 | Preview file with form | Form submission blocked by sandbox |
| 2 | Preview file with `window.top` access | `sandbox="allow-scripts"` prevents same-origin access |

**Result:** [ ] Pass [ ] Fail

---

## T10: `/task` Command

### T10.1: List tasks (empty)
**Prerequisites:** Fresh session with no tasks

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task` and press Enter | Message: `No tasks.` |

**Result:** [ ] Pass [ ] Fail

### T10.2: Add a task
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task add Test the task system` and press Enter | Message: `✓ Task added: Test the task system` |

**Result:** [ ] Pass [ ] Fail

### T10.3: List tasks with items
**Prerequisites:** At least one task exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task list` and press Enter | Shows tasks with IDs and status |

**Result:** [ ] Pass [ ] Fail

### T10.4: Add with alias `todo`
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/todo add Another task` and press Enter | Task added successfully |

**Result:** [ ] Pass [ ] Fail

### T10.5: List with alias `tasks`
**Prerequisites:** Tasks exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/tasks` and press Enter | Shows all tasks |

**Result:** [ ] Pass [ ] Fail

### T10.6: Complete a task
**Prerequisites:** A task exists (note its ID from `/task list`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task done <id>` and press Enter | Message: `✓ Task completed: <description>` |
| 2 | Type `/task list` and press Enter | Task shows `[x]` marker |

**Result:** [ ] Pass [ ] Fail

### T10.7: Complete with `complete` alias
**Prerequisites:** Task exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task complete <id>` and press Enter | Same as T10.6 |

**Result:** [ ] Pass [ ] Fail

### T10.8: Remove a task
**Prerequisites:** Task exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task remove <id>` and press Enter | Task removed from list |
| 2 | Type `/task list` and press Enter | Removed task no longer appears |

**Result:** [ ] Pass [ ] Fail

### T10.9: Remove with `rm` alias
**Prerequisites:** Task exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task rm <id>` and press Enter | Same as T10.8 |

**Result:** [ ] Pass [ ] Fail

### T10.10: Complete non-existent task
**Prerequisites:** `999` is not a valid task ID

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task done 999` and press Enter | Error: `Task not found: 999` |

**Result:** [ ] Pass [ ] Fail

### T10.11: Add without description
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task add` and press Enter | Error: `Usage: /task add <description>` |

**Result:** [ ] Pass [ ] Fail

### T10.12: Unknown subcommand
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/task fly` and press Enter | Error: `Unknown subcommand: fly. Usage: /task [list|add|done|remove]` |

**Result:** [ ] Pass [ ] Fail

### T10.13: Task persistence (negative test)
**Prerequisites:** Tasks exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Add several tasks | Tasks exist in memory |
| 2 | Refresh the browser page | All tasks are LOST (in-memory only) |

**Result:** [ ] Pass [ ] Fail

---

## T11: `/ai` Command

### T11.1: AI config with API key
**Prerequisites:** Valid OpenAI API key

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ai config apiKey=sk-your-key` and press Enter | Message: `✓ AI provider configured.` |

**Result:** [ ] Pass [ ] Fail

### T11.2: AI config without key
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ai config` and press Enter | Usage prompt (no error) |
| 2 | Type `/ai config apiKey=` and press Enter | Error: `Provide an API key: /ai config apiKey=sk-...` |

**Result:** [ ] Pass [ ] Fail

### T11.3: Ask question without config
**Prerequisites:** No API key configured (fresh session)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ai hello` and press Enter | Error: `AI error: No API key configured...` |

**Result:** [ ] Pass [ ] Fail

### T11.4: Ask question with config
**Prerequisites:** API key configured

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ai What is 2+2?` and press Enter | AI responds with answer |

**Result:** [ ] Pass [ ] Fail

### T11.5: Ai with alias `ask`
**Prerequisites:** API key configured

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ask What is the capital of France?` and press Enter | Same as T11.4 |

**Result:** [ ] Pass [ ] Fail

### T11.6: AI with no question
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/ai` and press Enter | Usage: `/ai <question> or /ai config <key=value>` |

**Result:** [ ] Pass [ ] Fail

---

## T12: `/agent` Command

### T12.1: Agent without config
**Prerequisites:** No API key configured

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/agent fix something` and press Enter | Error: `Agent error: No API key configured...` |

**Result:** [ ] Pass [ ] Fail

### T12.2: Agent with config (simple task)
**Prerequisites:** API key configured

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/agent list the files in the workspace` and press Enter | Agent runs, reads directory, returns file listing |

**Result:** [ ] Pass [ ] Fail

### T12.3: Agent with no task
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/agent` and press Enter | Error: `Usage: /agent <task description>` |

**Result:** [ ] Pass [ ] Fail

### T12.4: Agent with alias `auto`
**Prerequisites:** API key configured

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/auto count the number of TypeScript files` and press Enter | Same as T12.2 |

**Result:** [ ] Pass [ ] Fail

---

## T13: `/terminal` Command

### T13.1: List sessions
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal list` and press Enter | Lists terminal sessions (may be empty if none created yet) |

**Result:** [ ] Pass [ ] Fail

### T13.2: Create new session
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal new` and press Enter | Message: `Creating new terminal session...` |
| 2 | Check terminal panel | New session appears in terminal tab bar |
| 3 | Check terminal panel body | xterm.js terminal visible (if panel is open) |

**Result:** [ ] Pass [ ] Fail

### T13.3: Create with `create` alias
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal create` and press Enter | Same as T13.2 |

**Result:** [ ] Pass [ ] Fail

### T13.4: Switch session
**Prerequisites:** At least 2 terminal sessions exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal list` to see session IDs | Note the ID of the inactive session |
| 2 | Type `/terminal switch <id>` and press Enter | Active session changes |
| 3 | Check terminal tab bar | Different tab highlighted |

**Result:** [ ] Pass [ ] Fail

### T13.5: Close session
**Prerequisites:** At least 1 terminal session exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal close <id>` and press Enter | Session removed from tab bar |
| 2 | Type `/terminal list` and press Enter | Closed session no longer appears |

**Result:** [ ] Pass [ ] Fail

### T13.6: Close with `rm` alias
**Prerequisites:** Session exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal rm <id>` and press Enter | Same as T13.5 |

**Result:** [ ] Pass [ ] Fail

### T13.7: Unknown subcommand
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal fly` and press Enter | Error: `Usage: /terminal [list|new|close <id>|switch <id>]` |

**Result:** [ ] Pass [ ] Fail

---

## T14: Terminal Panel

### T14.1: Auto-open on shell command
**Prerequisites:** No terminal sessions exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `echo hello` (no `/` prefix) and press Enter | Terminal session auto-created |
| 2 | Check bottom of screen | Terminal panel opens with active session |
| 3 | Check xterm.js visible | Terminal output shows in terminal panel |

**Result:** [ ] Pass [ ] Fail

### T14.2: Collapse terminal panel
**Prerequisites:** Terminal panel is open (has active session)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click the toggle button (▼/▲) on right of terminal tab bar | Panel collapses, only header visible |
| 2 | Click toggle button again | Panel expands, xterm.js visible again |

**Result:** [ ] Pass [ ] Fail

### T14.3: Terminal tab switching via click
**Prerequisites:** At least 2 terminal sessions exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click on a different terminal tab in the terminal panel | That session becomes active |
| 2 | Check xterm.js | Shows that session's terminal output |

**Result:** [ ] Pass [ ] Fail

### T14.4: Terminal tab close via click
**Prerequisites:** At least 1 terminal session exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click the × on a terminal tab | Session is destroyed, tab disappears |

**Result:** [ ] Pass [ ] Fail

### T14.5: New terminal via + button
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click the + button in the terminal tab bar | New session created |

**Result:** [ ] Pass [ ] Fail

---

## T15: Workspace & Tabs

### T15.1: Welcome screen on load
**Prerequisites:** Fresh browser session

| Step | Action | Expected |
|------|--------|----------|
| 1 | Load the app | Welcome screen visible with "lemu" title and hint text |
| 2 | Check no messages | No message stream |
| 3 | Check no tabs | No main tab bar |

**Result:** [ ] Pass [ ] Fail

### T15.2: Message stream appears after first command
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/search function` and press Enter | Welcome screen replaced by message stream |
| 2 | Check workspace | Shows search results in message blocks |

**Result:** [ ] Pass [ ] Fail

### T15.3: Editor tab replaces message stream
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Run `/open package.json` | Editor tab created, file content shown in workspace |
| 2 | Check workspace | Shows editor content, NOT message stream |

**Result:** [ ] Pass [ ] Fail

### T15.4: Switch to message view
**Prerequisites:** Editor tab exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Close the active editor tab (click × in tab bar) | Tab closed |
| 2 | Check workspace | Returns to message stream (if messages exist) or welcome screen |

**Result:** [ ] Pass [ ] Fail

### T15.5: Multiple tabs
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open 3 different files via `/open` | 3 editor tabs in main tab bar |
| 2 | Click each tab | Content switches to that file |
| 3 | Close middle tab | Remaining tabs adjust, a neighboring tab becomes active |

**Result:** [ ] Pass [ ] Fail

---

## T16: Sidebar

### T16.1: Open Files section
**Prerequisites:** At least one file opened via `/open`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check sidebar | Open Files section shows the opened file path |
| 2 | Click a file in Open Files | That tab becomes active |

**Result:** [ ] Pass [ ] Fail

### T16.2: Recent Files section
**Prerequisites:** At least one file opened

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check sidebar | Recent Files section shows recently opened files |

**Result:** [ ] Pass [ ] Fail

### T16.3: Terminal Sessions section
**Prerequisites:** At least one terminal session exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check sidebar | Terminal Sessions section lists active sessions |
| 2 | Click a session | Switches to that terminal session |
| 3 | Click + button | Creates new terminal session |

**Result:** [ ] Pass [ ] Fail

---

## T17: Autocomplete

### T17.1: Slash menu opens on `/`
**Prerequisites:** Input bar focused

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/` | Command menu appears with all registered commands |
| 2 | Check menu items | Shows command names, descriptions, types |

**Result:** [ ] Pass [ ] Fail

### T17.2: Filter commands as you type
**Prerequisites:** Slash menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/op` | Menu filters to commands matching "op" (open, copy options, etc.) |

**Result:** [ ] Pass [ ] Fail

### T17.3: Navigate menu with arrow keys
**Prerequisites:** Slash menu open, multiple items visible

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press ArrowDown | Selection moves down |
| 2 | Press ArrowUp | Selection moves up |

**Result:** [ ] Pass [ ] Fail

### T17.4: Select with Enter
**Prerequisites:** Slash menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Enter | Selected command inserted into input, menu closes |

**Result:** [ ] Pass [ ] Fail

### T17.5: Select with Tab
**Prerequisites:** Slash menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Tab | Same as Enter — selected command inserted |

**Result:** [ ] Pass [ ] Fail

### T17.6: Close menu with Escape
**Prerequisites:** Slash menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Escape | Menu closes, input retains current text |

**Result:** [ ] Pass [ ] Fail

### T17.7: No slash menu for shell commands
**Prerequisites:** No slash menu visible

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `npm` | No menu appears |

**Result:** [ ] Pass [ ] Fail

---

## T18: History Navigation

### T18.1: ArrowUp loads previous command
**Prerequisites:** At least one command has been executed

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press ArrowUp | Previous command loaded into input |

**Result:** [ ] Pass [ ] Fail

### T18.2: ArrowDown loads next command
**Prerequisites:** History has items, currently viewing an older command

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press ArrowDown | Next newer command loaded (or returns to saved input) |

**Result:** [ ] Pass [ ] Fail

### T18.3: History with slash commands
**Prerequisites:** Slash commands have been executed

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press ArrowUp repeatedly | Cycles through both slash commands and shell commands in history |

**Result:** [ ] Pass [ ] Fail

---

## T19: Keyboard Shortcuts

### T19.1: Enter submits
**Prerequisites:** Input has text, no menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type text and press Enter | Command submitted |

**Result:** [ ] Pass [ ] Fail

### T19.2: Escape clears history/resets
**Prerequisites:** Not navigating history, no menu open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Escape | Nothing visible happens (clears autocomplete + resets history cursor) |

**Result:** [ ] Pass [ ] Fail

### T19.3: Escape closes menu
**Prerequisites:** Slash menu is open

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Escape | Menu closes |

**Result:** [ ] Pass [ ] Fail

---

## T20: WebSocket & Terminal Sessions

### T20.1: WebSocket connects on load
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open browser developer tools → Network → WS | Connection to `ws://localhost:3001/ws` established |
| 2 | Check console | No connection errors |

**Result:** [ ] Pass [ ] Fail

### T20.2: No session on connect
**Prerequisites:** App loaded, no commands run yet

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/terminal list` and press Enter | `No sessions` or empty list |

**Result:** [ ] Pass [ ] Fail

### T20.3: Session created on first shell command
**Prerequisites:** App loaded, no terminal sessions exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `echo session test` (no `/`) and press Enter | Session auto-created, output appears in terminal panel |

**Result:** [ ] Pass [ ] Fail

### T20.4: Multiple sessions
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Run shell command (auto-creates session 1) | Session 1 created |
| 2 | Type `/terminal new` | Session 2 created |
| 3 | Type `/terminal list` | Both sessions visible |

**Result:** [ ] Pass [ ] Fail

### T20.5: Session isolation
**Prerequisites:** Multiple sessions exist

| Step | Action | Expected |
|------|--------|----------|
| 1 | Switch to session 1, run `cd /tmp` | Session 1 cwd changes |
| 2 | Switch to session 2, run `pwd` | Session 2 still in original directory |

**Result:** [ ] Pass [ ] Fail

---

## T21: Server API

### T21.1: File list API
**Prerequisites:** Server running

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open browser to `http://localhost:3001/api/fs/list` | JSON response with `success: true` and `entries` array |

**Result:** [ ] Pass [ ] Fail

### T21.2: File read API
**Prerequisites:** Server running, file exists

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open browser to `http://localhost:3001/api/fs/read?path=package.json` | JSON with `success: true` and `content` string |

**Result:** [ ] Pass [ ] Fail

### T21.3: Shell exec API
**Prerequisites:** Server running

| Step | Action | Expected |
|------|--------|----------|
| 1 | POST to `http://localhost:3001/api/shell/exec` with `{ "command": "echo hi" }` | JSON with `success: true`, `stdout: "hi\n"`, `code: 0` |

**Result:** [ ] Pass [ ] Fail

---

## Edge Cases

### T22.1: Very long command input
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type a very long command (>1000 characters) | Should execute (no input length limit enforced) |

**Result:** [ ] Pass [ ] Fail

### T22.2: Rapid consecutive commands
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type and submit 10 commands rapidly | All should execute sequentially (React batches state updates) |

**Result:** [ ] Pass [ ] Fail

### T22.3: Server restart while connected
**Prerequisites:** App loaded, WebSocket connected

| Step | Action | Expected |
|------|--------|----------|
| 1 | Restart the server | WebSocket disconnects |
| 2 | Check console | WebSocket close event |

**Result:** [ ] Pass [ ] Fail

### T22.4: Special characters in command
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/run echo "hello & world"` | Quotes properly handled |
| 2 | Type `echo $PATH` (no prefix) | Environment variable expanded |

**Result:** [ ] Pass [ ] Fail

### T22.5: Unicode in commands
**Prerequisites:** App loaded

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type `/open 文件.txt` | Unicode path handled (may fail if file doesn't exist, but no crash) |

**Result:** [ ] Pass [ ] Fail

---

## Testing Checklist Summary

### Quick Smoke Test (5 min)
- [ ] App loads without errors
- [ ] Welcome screen visible
- [ ] Input bar is focused
- [ ] Type `/` — slash menu opens
- [ ] Type `!echo hi` — command executes
- [ ] Type `echo hi` (no prefix) — terminal session created, output shown

### All Commands (20 min)
- [ ] `/open` — file opens in tab
- [ ] `/copy` — file copied
- [ ] `/move` — file moved
- [ ] `/delete` — file deleted with `-f`
- [ ] `/search` — pattern found
- [ ] `/git` — status shows
- [ ] `/run` — shell exec works
- [ ] `/browser` — HTML previews
- [ ] `/task` — CRUD operations
- [ ] `/ai` — config and query
- [ ] `/agent` — autonomous run
- [ ] `/terminal` — session management

### Edge Cases (10 min)
- [ ] Path traversal blocked
- [ ] Missing args show usage
- [ ] Binary files handled
- [ ] Large files don't crash
- [ ] `-f` required for delete
- [ ] Tab close works
- [ ] Terminal panel toggle
