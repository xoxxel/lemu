import { useState, useCallback, useRef, useEffect } from 'react';
import { parse, isSlashCommand, isShellCommand } from './core/parser';
import { getRuntime } from './core/runtime/instance';
import { useCommandHistory } from './hooks/useCommandHistory';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useTerminal, type SessionState, type WSMessage } from './hooks/useTerminal';
import type { Tab, TabType } from './core/tabs/types';
import { createTabId, TAB_ICONS, friendlyTerminalName } from './core/tabs/types';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import InputBar from './components/InputBar';
import TerminalTabBar from './components/TerminalTabBar';
import TerminalOutput from './components/TerminalOutput';
import MainTabBar from './components/MainTabBar';
import './styles/app.css';

function applyAutocomplete(input: string, selected: string): string {
  const trimmed = input.trim();
  const parsed = parse(trimmed);
  if (parsed && parsed.args.length > 0) {
    const cmdPrefix = '/' + parsed.name + ' ';
    const preceding = parsed.args.slice(0, -1);
    if (preceding.length > 0) {
      return cmdPrefix + preceding.join(' ') + ' ' + selected + ' ';
    }
    return cmdPrefix + selected + ' ';
  }
  return selected + ' ';
}

export interface Message {
  id: string;
  type: 'user' | 'system' | 'error' | 'terminal';
  content: string;
  data?: unknown;
  terminalOutput?: string[];
  terminalRunning?: boolean;
  timestamp: number;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cwd, setCwd] = useState('~');
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const terminalMsgId = useRef<string | null>(null);

  const { add: addHistory, up: historyUp, down: historyDown, reset: resetHistory, isNavigating } = useCommandHistory();
  const { suggestions, selectedIndex, update: updateAutocomplete, clear: clearAutocomplete, selectNext, selectPrev, selectCurrent } = useAutocomplete();
  const terminal = useTerminal();

  const addMessage = useCallback((type: Message['type'], content: string, data?: unknown) => {
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      data,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  const addTab = useCallback((type: TabType, title: string, path?: string, state?: Record<string, unknown>) => {
    const id = createTabId(type);
    const tab: Tab = {
      id,
      type,
      title,
      icon: TAB_ICONS[type],
      closable: true,
      path,
      state,
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(id);
    return id;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id && next.length > 0) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx].id);
      } else if (next.length === 0) {
        setActiveTabId(null);
      }
      return next;
    });
  }, [activeTabId]);

  const selectTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  useEffect(() => {
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = workspaceRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const s = terminal.sessions.find((s) => s.id === terminal.activeSessionId);
    if (s) setCwd(s.cwd);
  }, [terminal.sessions, terminal.activeSessionId]);

  useEffect(() => {
    const unsub = terminal.onMessage((msg: WSMessage) => {
      if (msg.type === 'output' && terminalMsgId.current) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === terminalMsgId.current && m.type === 'terminal') {
              const newOutput = [...(m.terminalOutput || []), msg.data as string];
              return {
                ...m,
                terminalOutput: newOutput,
              };
            }
            return m;
          })
        );
      }
    });
    return unsub;
  }, [terminal]);

  const handleShellCommand = useCallback(async (trimmed: string) => {
    const sid = await terminal.ensureSession();
    if (!sid) {
      addMessage('error', 'Failed to create terminal session.');
      return;
    }

    setTerminalPanelOpen(true);

    const userMsgId = addMessage('user', trimmed);

    const termData = {
      type: 'terminal' as const,
      sessionId: sid,
      output: [] as string[],
      isRunning: true,
      command: trimmed,
    };

    updateMessage(userMsgId, {
      type: 'terminal',
      terminalOutput: [],
      terminalRunning: true,
      data: termData,
    });
    terminalMsgId.current = userMsgId;

    terminal.sendInput(trimmed, sid);
  }, [terminal, addMessage, updateMessage]);

  const handleSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addHistory(trimmed);
    setInputValue('');
    clearAutocomplete();

    if (trimmed.startsWith('@')) {
      addMessage('user', trimmed);
      const topic = trimmed.slice(1).trim();
      if (!topic) {
        addMessage('system', 'Usage: @<plugin|command> — e.g. @open, @search, @git');
        return;
      }
      const result = await getRuntime().execute({ name: 'help', args: [topic], raw: trimmed });
      addMessage(result.success ? 'system' : 'error', result.message);
      return;
    }

    if (isSlashCommand(trimmed)) {
      addMessage('user', trimmed);
      const parsed = parse(trimmed);
      if (!parsed) {
        addMessage('error', 'Invalid command syntax.');
        return;
      }

      if (parsed.name === 'terminal') {
        handleTerminalCommand(parsed.args);
        return;
      }

      if (parsed.name === 'open' || parsed.name === 'edit') {
        const path = parsed.args[0];
        if (!path) {
          addMessage('error', 'Usage: /open <path>');
          return;
        }
        const result = await getRuntime().execute(parsed);
        addMessage(result.success ? 'system' : 'error', result.message, result.data);
        if (result.success && result.data && typeof result.data === 'object' && 'path' in result.data) {
          addTab('editor', path, path, result.data as Record<string, unknown>);
          setRecentFiles((prev) => {
            const next = [path, ...prev.filter((f) => f !== path)].slice(0, 10);
            return next;
          });
        }
        return;
      }

      let result;
      try {
        result = await getRuntime().execute(parsed);
      } catch (err) {
        addMessage('error', `Execution error: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      addMessage(result.success ? 'system' : 'error', result.message, result.data);

      if (result.data && typeof result.data === 'object' && 'path' in result.data) {
        const path = (result.data as Record<string, unknown>).path as string;
        setRecentFiles((prev) => {
          const next = [path, ...prev.filter((f) => f !== path)].slice(0, 10);
          return next;
        });
      }
    } else if (isShellCommand(trimmed)) {
      await handleShellCommand(trimmed);
    } else {
      addMessage('user', trimmed);
      addMessage('error', 'Not a valid command. Type / for available commands.');
    }
  }, [addHistory, addMessage, updateMessage, clearAutocomplete, terminal, handleShellCommand, addTab]);

  const handleTerminalCommand = useCallback((args: string[]) => {
    const sub = args[0];
    if (!sub || sub === 'list') {
      const list = terminal.sessions.map((s) =>
        `  [${s.id === terminal.activeSessionId ? '*' : ' '}] ${s.label || s.shellType} (${s.id.slice(0, 8)}...) cwd: ${s.cwd}`
      ).join('\n');
      addMessage('system', `Terminal sessions:\n${list || '  No sessions'}`);
    } else if (sub === 'new' || sub === 'create') {
      terminal.createSession();
      setTerminalPanelOpen(true);
      addMessage('system', 'Creating new terminal session...');
    } else if ((sub === 'close' || sub === 'rm') && args[1]) {
      terminal.destroySession(args[1]);
      addMessage('system', `Closed session: ${args[1]}`);
    } else if (sub === 'switch' && args[1]) {
      terminal.switchSession(args[1]);
      addMessage('system', `Switched to session: ${args[1]}`);
    } else {
      addMessage('error', 'Usage: /terminal [list|new|close <id>|switch <id>]');
    }
  }, [terminal, addMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.startsWith('/')) {
      updateAutocomplete(value);
    } else {
      clearAutocomplete();
    }
    if (isNavigating) resetHistory();
  }, [updateAutocomplete, clearAutocomplete, isNavigating, resetHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const menuOpen = suggestions.length > 0;

    if (menuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNext();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrev();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = selectCurrent();
        if (selected) {
          setInputValue(applyAutocomplete(inputValue, selected));
          clearAutocomplete();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearAutocomplete();
        return;
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = historyUp(inputValue);
      if (prev !== null) setInputValue(prev);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyDown();
      if (next !== null) setInputValue(next);
      return;
    }

    if (e.key === 'Escape') {
      clearAutocomplete();
      resetHistory();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(inputValue);
    }
  }, [inputValue, suggestions, selectCurrent, selectNext, selectPrev, clearAutocomplete, handleSubmit, historyUp, historyDown, resetHistory]);

  const allCommands = (() => {
    try {
      return getRuntime().pluginRegistry.getAll().flatMap((p) =>
        (p.commands || []).map((cmd) => ({
          name: cmd.name,
          description: cmd.description,
          pluginName: p.name,
          usage: cmd.usage,
        }))
      );
    } catch {
      return [];
    }
  })();

  const mainTabs = tabs;
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  const handleTerminalToggle = useCallback(() => {
    setTerminalPanelOpen((prev) => !prev);
  }, []);

  return (
    <div className="app" onClick={() => {
      if (window.getSelection()?.toString()) return;
      inputRef.current?.focus();
    }}>
      <Sidebar
        cwd={cwd}
        recentFiles={recentFiles}
        openTabs={tabs.map((t) => t.path).filter(Boolean) as string[]}
        activeTab={activeTab?.path || null}
        activeTasks={activeTasks}
        terminalSessions={terminal.sessions}
        activeTerminalSession={terminal.activeSessionId}
        onTabClick={(path) => {
          const tab = tabs.find((t) => t.path === path);
          if (tab) setActiveTabId(tab.id);
        }}
        onTerminalSessionClick={(id) => terminal.switchSession(id)}
        onTerminalSessionClose={(id) => terminal.destroySession(id)}
        onNewTerminalSession={() => {
          terminal.createSession();
          setTerminalPanelOpen(true);
        }}
        commands={allCommands}
        onCommandClick={(cmd) => {
          setInputValue('/' + cmd + ' ');
          inputRef.current?.focus();
        }}
      />
      <div className="main">
        {mainTabs.length > 0 && (
          <MainTabBar
            tabs={mainTabs}
            activeTabId={activeTabId}
            onSelect={selectTab}
            onClose={closeTab}
          />
        )}
        <Workspace
          ref={workspaceRef}
          messages={messages}
          activeTab={activeTab}
          tabs={tabs}
        />
        {terminal.sessions.length > 0 && (
          <div className={`terminal-panel ${terminalPanelOpen ? '' : 'collapsed'}`}>
            <div className="terminal-panel-header">
              <TerminalTabBar
                sessions={terminal.sessions}
                activeSessionId={terminal.activeSessionId}
                onSelect={(id) => terminal.switchSession(id)}
                onCreate={() => terminal.createSession()}
                onClose={(id) => terminal.destroySession(id)}
              />
              <button className="terminal-toggle-btn" onClick={handleTerminalToggle}>
                {terminalPanelOpen ? '\u25BC' : '\u25B2'}
              </button>
            </div>
            {terminalPanelOpen && terminal.activeSessionId && (
              <div className="terminal-panel-body">
                <TerminalOutput
                  sessionId={terminal.activeSessionId}
                  ws={terminal.ws}
                />
              </div>
            )}
          </div>
        )}
        <InputBar
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSuggestionClick={(idx) => {
            const selected = suggestions[idx];
            if (selected) {
              setInputValue(applyAutocomplete(inputValue, selected.value));
              clearAutocomplete();
              inputRef.current?.focus();
            }
          }}
        />
      </div>
    </div>
  );
}
