import { useState, useCallback, useRef, useEffect } from 'react';
import { parse } from './core/parser';
import { getRuntime } from './core/runtime/instance';
import { useCommandHistory } from './hooks/useCommandHistory';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useTerminal } from './hooks/useTerminal';
import type { Tab } from './core/tabs/types';
import { createTabId } from './core/tabs/types';

import type { FeedbackEvent } from './core/feedback/types';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import InputBar from './components/InputBar';
import FeedbackBar from './components/FeedbackBar';
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
    const lastArg = parsed.args[parsed.args.length - 1];
    const dirIndex = lastArg.lastIndexOf('/');
    const dirPrefix = dirIndex >= 0 ? lastArg.slice(0, dirIndex + 1) : '';
    const newArg = dirPrefix + selected;
    if (preceding.length > 0) {
      return cmdPrefix + preceding.join(' ') + ' ' + newArg + ' ';
    }
    return cmdPrefix + newArg + ' ';
  }
  return selected + ' ';
}

export interface Message {
  id: string;
  type: 'user' | 'system' | 'error';
  content: string;
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
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const { add: addHistory, up: historyUp, down: historyDown, reset: resetHistory, isNavigating } = useCommandHistory();
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const activeTabType = tabs.find((t) => t.id === activeTabId)?.type ?? null;
  const { suggestions, selectedIndex, statusText, update: updateAutocomplete, clear: clearAutocomplete, selectNext, selectPrev, selectCurrent } = useAutocomplete(activeTabType);
  const terminal = useTerminal();

  const addMessage = useCallback((type: Message['type'], content: string) => {
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const addTab = useCallback((type: string, title: string, path?: string, state?: Record<string, unknown>) => {
    const id = createTabId(type);
    const viewMeta = getRuntime().viewMetaMap;
    const meta = viewMeta[type];
    const tab: Tab = {
      id,
      type,
      title,
      icon: meta?.icon ?? '\u25A1',
      closable: true,
      path,
      state,
    };
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      return [...prev, tab];
    });
    setActiveTabId(id);
    return id;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(next.length > 0 ? next[Math.min(idx, next.length - 1)].id : null);
      }
      return next;
    });
  }, [activeTabId]);

  const selectTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  useEffect(() => {
    const s = terminal.sessions.find((s) => s.id === terminal.activeSessionId);
    if (s) setCwd(s.cwd);
  }, [terminal.sessions, terminal.activeSessionId]);

  useEffect(() => {
    const unsub = getRuntime().feedback.subscribe((ev) => {
      setFeedback(ev);
    });
    return unsub;
  }, []);

  const handleShellCommand = useCallback(async (trimmed: string) => {
    const sid = await terminal.ensureSession();
    if (!sid) {
      addMessage('error', 'Failed to create terminal session.');
      return;
    }

    setTerminalPanelOpen(true);
    addMessage('user', trimmed);
    terminal.sendInput(trimmed, sid);
  }, [terminal, addMessage]);

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

  const mainTabs = tabs;

  const pinnedTabEntries = tabs
    .filter((t) => pinnedTabs.has(t.id))
    .map((t) => ({ id: t.id, title: t.title }));

  const togglePinTab = useCallback((id: string) => {
    setPinnedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handlePinnedTabClick = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const handleSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addHistory(trimmed);
    setInputValue('');
    clearAutocomplete();

    // Plugin Action Mode: >action
    if (trimmed.startsWith('>')) {
      const actionQuery = trimmed.slice(1).trim();
      if (!actionQuery) {
        addMessage('user', trimmed);
        const actions = activeTab
          ? getRuntime().actionRegistry.getForType(activeTab.type)
          : [];
        let body: string;
        if (actions.length === 0) {
          body = activeTab
            ? `  No actions for ${activeTab.type}`
            : '  No active tab. Open a file or view first.';
        } else {
          body = actions.map(a => `  ${a.id}  ${a.title ?? ''}`).join('\n');
        }
        addMessage('system', `Available actions:\n${body}`);
        return;
      }
      if (!activeTab) {
        addMessage('user', trimmed);
        addMessage('error', 'No active tab. Open a file or view first.');
        return;
      }
      const runtime = getRuntime();
      let action = runtime.actionRegistry.findByTypeAndId(activeTab.type, actionQuery);
      if (!action) {
        const allActions = runtime.actionRegistry.getForType(activeTab.type);
        action = allActions.find(a =>
          a.aliases?.some(al => al.toLowerCase() === actionQuery.toLowerCase())
        );
      }
      if (!action) {
        addMessage('user', trimmed);
        addMessage('error', `No action '${actionQuery}' for ${activeTab.type}. Type > to list available actions.`);
        runtime.feedback.show({
          level: 'error',
          message: `No action '${actionQuery}' for ${activeTab.type}`,
          suggestion: 'Type > to list available actions',
          dismissible: true,
        });
        return;
      }
      console.log('[ACTIONS] selected:', action.id);
      addMessage('user', trimmed);
      const ctx = {
        tabId: activeTab.id,
        tabType: activeTab.type,
        tabState: activeTab.state ?? {},
        pinned: pinnedTabs.has(activeTab.id),
        pin: () => togglePinTab(activeTab.id),
        unpin: () => togglePinTab(activeTab.id),
      };
      try {
        const result = await action.handler(ctx);
        addMessage('system', result);
      } catch (err) {
        const msg = `Action error: ${err instanceof Error ? err.message : String(err)}`;
        addMessage('error', msg);
        runtime.feedback.show({ level: 'error', message: msg, dismissible: true });
      }
      return;
    }

    // Help Mode: @topic
    if (trimmed.startsWith('@')) {
      addMessage('user', trimmed);
      const topic = trimmed.slice(1).trim();
      if (!topic) {
        addMessage('system', 'Usage: @<plugin|command> \u2014 e.g. @open, @search, @git');
        return;
      }
      const result = await getRuntime().execute({ name: 'help', args: [topic], raw: trimmed });
      addMessage(result.success ? 'system' : 'error', result.message);
      if (result.success && result.data && typeof result.data === 'object') {
        const d = result.data as Record<string, unknown>;
        const dType = d.type as string | undefined;
        const viewMeta = getRuntime().viewMetaMap;
        if (dType && viewMeta[dType]) {
          addTab(dType, `help: ${topic}`, undefined, d);
        }
      }
      return;
    }

    // Command Mode: /cmd or !cmd (rewritten to /run cmd)
    if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
      const parsed = parse(trimmed);
      addMessage('user', trimmed);
      if (!parsed) {
        addMessage('error', 'Invalid command syntax.');
        return;
      }

      if (parsed.name === 'terminal') {
        handleTerminalCommand(parsed.args);
        return;
      }

      let result;
      try {
        result = await getRuntime().execute(parsed);
      } catch (err) {
        addMessage('error', `Execution error: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      addMessage(result.success ? 'system' : 'error', result.message);

      if (result.success && result.data && typeof result.data === 'object') {
        const d = result.data as Record<string, unknown>;
        const dType = d.type as string | undefined;
        const viewMeta = getRuntime().viewMetaMap;
        if (dType && viewMeta[dType]) {
          const title = (d.path as string) || (d.command as string) || parsed.name;
          addTab(dType, title, d.path as string | undefined, d);
        }

        const path = d.path as string | undefined;
        if (path) {
          setRecentFiles((prev) => {
            const next = [path, ...prev.filter((f) => f !== path)].slice(0, 10);
            return next;
          });
        }
      }
      return;
    }

    // Terminal Mode (default): plain text -> shell
    await handleShellCommand(trimmed);
  }, [addHistory, addMessage, clearAutocomplete, terminal, handleShellCommand, addTab, activeTab, pinnedTabs, togglePinTab, handleTerminalCommand]);

  const dismissFeedback = useCallback(() => {
    getRuntime().feedback.clear();
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (getRuntime().feedback.currentFeedback) {
      getRuntime().feedback.clear();
    }
    if (value.startsWith('/') || value.startsWith('>')) {
      updateAutocomplete(value);
    } else {
      clearAutocomplete();
    }
    if (isNavigating) resetHistory();
  }, [updateAutocomplete, clearAutocomplete, isNavigating, resetHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && feedback) {
      e.preventDefault();
      dismissFeedback();
      return;
    }

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
  }, [inputValue, suggestions, feedback, selectCurrent, selectNext, selectPrev, clearAutocomplete, handleSubmit, historyUp, historyDown, resetHistory, dismissFeedback]);

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
        pinnedTabs={pinnedTabEntries}
        onPinnedTabClick={handlePinnedTabClick}
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
          activeTab={activeTab}
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
        <FeedbackBar feedback={feedback} onDismiss={dismissFeedback} />
        <InputBar
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          hint={statusText}
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
