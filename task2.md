\# Add Full Native Shell Support to the Terminal Workspace



\## Goal



Extend the existing command-driven terminal workspace with FULL native shell support.



This is NOT a rewrite.



This is an extension of the current architecture.



The existing features must remain intact:



\* slash command system

\* workspace UI

\* sidebar

\* event stream

\* file operations

\* command parser



We are ADDING a real embedded terminal engine underneath the workspace.



\---



\# Product Direction



The application should become the user's PRIMARY terminal environment.



The user should be able to:



\* execute all terminal commands

\* run interactive terminal applications

\* manage projects

\* use git

\* run npm/pnpm/python/docker commands

\* stay inside this workspace permanently



without opening another terminal app.



\---



\# Critical Requirement



The app must support a REAL shell environment.



NOT:



\* simulated terminal output

\* limited command execution

\* fake console rendering



We need:



\# a true PTY-based terminal system



\---



\# Required Technology



Use:



\* node-pty



This is mandatory.



Reason:



\* persistent shell sessions

\* interactive terminal apps

\* stdin/stdout support

\* terminal resizing

\* ANSI color support

\* shell state persistence



\---



\# Required Shell Support



Depending on operating system:



\## Windows



\* PowerShell



\## Linux/macOS



\* bash

\* zsh



\---



\# Core Execution Rules



\## Rule 1 — Slash Commands



If input starts with:



```text id="kxxh8u"

/

```



Use the INTERNAL command system.



Examples:



```text id="2m6kqg"

/open package.json

/copy src backup

/search useEffect

```



These commands use:



\* internal APIs

\* filesystem layer

\* workspace actions



\---



\## Rule 2 — Native Shell Commands



If input does NOT start with `/`



Forward input directly to the active PTY shell session.



Examples:



```text id="s5dix7"

npm install

git status

pnpm dev

python

docker ps

```



These commands must execute inside the real shell.



\---



\# Architecture Update



Add a new layer:



```text id="olc7gk"

UI

&#x20;↓

Command Router

&#x20;↓

PTY Session Manager

&#x20;↓

Shell Process

```



\---



\# Required New Modules



Create:



```text id="8mff7u"

src/core/terminal/

&#x20; pty-manager.ts

&#x20; shell-session.ts

&#x20; terminal-renderer.ts

&#x20; ansi-parser.ts

&#x20; shell-history.ts

&#x20; terminal-events.ts

```



\---



\# PTY Session Requirements



Each session must maintain:



```ts id="yte0m5"

{

&#x20; id,

&#x20; cwd,

&#x20; shellType,

&#x20; ptyProcess,

&#x20; outputBuffer,

&#x20; commandHistory,

&#x20; activeProcesses,

&#x20; createdAt

}

```



\---



\# Required Features



\## 1. Full Terminal Execution



The following must work:



```bash id="qmq85n"

npm install

git status

pnpm dev

python

node

docker ps

ssh

```



\---



\# 2. Interactive Terminal Applications



The following must function correctly:



```bash id="y3b6v7"

vim

nvim

python

ssh

htop

btop

```



Requirements:



\* keyboard forwarding

\* interactive stdin

\* proper stdout rendering

\* terminal resize support



\---



\# 3. Persistent Shell State



Shell sessions must preserve state.



Example:



```bash id="2jvqmn"

cd project

npm run dev

```



The working directory must persist across commands.



DO NOT use isolated exec() calls.



\---



\# 4. Live Streaming Output



Shell output must stream live into the workspace UI.



Requirements:



\* realtime rendering

\* ANSI color support

\* stdout/stderr handling

\* no polling



\---



\# 5. Multiple Terminal Sessions



Architecture must support:



\* terminal tabs

\* split terminals

\* background tasks



Even if UI is added later.



\---



\# 6. Terminal Event Stream



Every shell execution should also create structured workspace events.



Example:



```text id="xjot1s"

User:

npm install



System:

Running command...



stdout:

added 342 packages

```



This is important for future AI integration.



\---



\# 7. Command History



Persist:



\* slash commands

\* shell commands

\* cwd history



\---



\# 8. ANSI Rendering



Support:



\* terminal colors

\* cursor movement

\* interactive rendering

\* loading animations



\---



\# Input Routing Logic



\## Slash Commands



```text id="8kt6bl"

/open file.ts

```



↓



internal command system



\---



\## Native Terminal Commands



```text id="xbom4u"

git status

```



↓



active PTY shell session



\---



\# Important Constraint



Do NOT break the existing architecture.



KEEP:



\* slash command system

\* event stream

\* workspace layout

\* sidebar

\* file operations

\* parser architecture



Only EXTEND the system with native shell capabilities.



\---



\# Long-Term Goal



This project is evolving into:



\* terminal workspace

\* shell environment

\* development cockpit

\* AI-native operating workspace



Future AI systems must be able to:



\* inspect shell output

\* execute commands

\* manage sessions

\* analyze logs

\* automate workflows



Therefore:



\* terminal events must be structured

\* shell state must be accessible

\* architecture must remain modular



\---



\# Priority Order



\## Phase 1



\* node-pty integration

\* shell session management

\* command routing

\* live terminal rendering



\## Phase 2



\* terminal tabs

\* split terminals

\* background processes



\## Phase 3



\* AI integration

\* MCP tools

\* browser automation

\* autonomous workflows



\---



\# Final Requirement



The user should feel that:



"This application IS my terminal."



Not:

"This application contains a terminal."



