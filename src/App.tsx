import { useState, useCallback, useRef, useEffect } from 'react';
import { parse, isSlashCommand, isShellCommand } from './core/parser';
import { executor } from './core/executor';
import { useCommandHistory } from './hooks/useCommandHistory';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useTerminal, type SessionState, type WSMessage } from './hooks/useTerminal';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import InputBar from './components/InputBar';
import TerminalTabBar from './components/TerminalTabBar';
import TerminalOutput from './components/TerminalOutput';
import { createLeafNode, type SplitNode } from './components/SplitPane';
import './styles/app.css';

export interface Message {
  id: string;
  type: 'user' | 'system' | 'error' | 'terminal';
  content: string;
  data?: unknown;
  terminalOutput?: string[];
  terminalRunning?: boolean;
  timestamp: number;
}

interface TerminalMessageData {
  type: 'terminal';
  sessionId: string;
  output: string[];
  isRunning: boolean;
  command: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cwd, setCwd] = useState('~');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [processes, setProcesses] = useState<Array<{ pid: number; command: string; sessionId: string }>>([]);
  const [splitNodes, setSplitNodes] = useState<SplitNode[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const terminalMsgId = useRef<string | null>(null);

  const { add: addHistory } = useCommandHistory();
  const { suggestions, selectedIndex, update: updateAutocomplete, clear: clearAutocomplete, selectNext, selectPrev } = useAutocomplete();
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
              const data = m.data as TerminalMessageData | undefined;
              const newOutput = [...(data?.output || []), msg.data as string];
              return {
                ...m,
                terminalOutput: newOutput,
                data: { ...data, output: newOutput, isRunning: true } as TerminalMessageData,
              };
            }
            return m;
          })
        );
      }
      if (msg.type === 'process-list') {
        setProcesses((msg.processes as Array<{ pid: number; command: string; sessionId: string }>) || []);
      }
    });
    return unsub;
  }, [terminal]);

  useEffect(() => {
    if (terminal.sessionId && splitNodes.length === 0) {
      const node = createLeafNode(terminal.sessionId);
      setSplitNodes([node]);
    }
  }, [terminal.sessionId, splitNodes.length]);

  const handleShellCommand = useCallback((trimmed: string) => {
    const sid = terminal.activeSessionId || terminal.sessionId;
    if (!sid) return;

    const userMsgId = addMessage('user', trimmed);

    const termData: TerminalMessageData = {
      type: 'terminal',
      sessionId: sid,
      output: [],
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

      if (parsed.name === 'split' || parsed.name === 'hsplit' || parsed.name === 'vsplit') {
        handleSplitCommand(parsed.name, parsed.args);
        return;
      }

      if (parsed.name === 'ps') {
        handlePSCommand();
        return;
      }

      const result = await executor.execute(parsed);
      addMessage(result.success ? 'system' : 'error', result.message, result.data);

      if (result.data && typeof result.data === 'object' && 'path' in result.data) {
        const path = (result.data as Record<string, unknown>).path as string;
        setRecentFiles((prev) => {
          const next = [path, ...prev.filter((f) => f !== path)].slice(0, 10);
          return next;
        });
        setOpenTabs((prev) => {
          if (!prev.includes(path)) return [...prev, path];
          return prev;
        });
        setActiveTab(path);
      }
    } else if (isShellCommand(trimmed)) {
      handleShellCommand(trimmed);
    } else {
      addMessage('user', trimmed);
      addMessage('error', 'Not a valid command. Type / for available commands.');
    }
  }, [addHistory, addMessage, updateMessage, clearAutocomplete, terminal, handleShellCommand]);

  const handleTerminalCommand = useCallback((args: string[]) => {
    const sub = args[0];
    if (!sub || sub === 'list') {
      const list = terminal.sessions.map((s) =>
        `  [${s.id === terminal.activeSessionId ? '*' : ' '}] ${s.label || s.shellType} (${s.id.slice(0, 8)}...) cwd: ${s.cwd}`
      ).join('\n');
      addMessage('system', `Terminal sessions:\n${list || '  No sessions'}`);
    } else if (sub === 'new' || sub === 'create') {
      terminal.createSession();
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

  const handleSplitCommand = useCallback((name: string, args: string[]) => {
    const direction = name === 'vsplit' ? 'vertical' : 'horizontal';
    addMessage('system', `Split ${direction}`);
  }, [addMessage]);

  const handlePSCommand = useCallback(() => {
    if (terminal.ws && terminal.ws.readyState === WebSocket.OPEN) {
      terminal.ws.send(JSON.stringify({ type: 'list-processes' }));
    }
    addMessage('system', `Background processes: ${processes.length}`);
  }, [terminal.ws, processes.length, addMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (value.startsWith('/')) {
      updateAutocomplete(value);
    } else {
      clearAutocomplete();
    }
  }, [updateAutocomplete, clearAutocomplete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && !suggestions.length) {
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && !suggestions.length) {
      e.preventDefault();
    } else if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      selectNext();
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      selectPrev();
    } else if (e.key === 'Tab' && suggestions.length) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      if (selected) {
        setInputValue(selected.value + ' ');
        clearAutocomplete();
      }
    } else if (e.key === 'Escape') {
      clearAutocomplete();
    } else if (e.key === 'Enter') {
      handleSubmit(inputValue);
    }
  }, [inputValue, suggestions, selectedIndex, selectNext, selectPrev, clearAutocomplete, handleSubmit]);

  const renderTerminalPane = useCallback((sessionId: string, nodeId: string) => {
    return (
      <TerminalOutput
        key={nodeId}
        sessionId={sessionId}
        ws={terminal.ws}
      />
    );
  }, [terminal.ws]);

  return (
    <div className="app" onClick={() => inputRef.current?.focus()}>
      <Sidebar
        cwd={cwd}
        recentFiles={recentFiles}
        openTabs={openTabs}
        activeTab={activeTab}
        activeTasks={activeTasks}
        terminalSessions={terminal.sessions}
        activeTerminalSession={terminal.activeSessionId}
        onTabClick={(tab) => setActiveTab(tab)}
        onTerminalSessionClick={(id) => terminal.switchSession(id)}
        onTerminalSessionClose={(id) => terminal.destroySession(id)}
        onNewTerminalSession={() => terminal.createSession()}
        processes={processes}
      />
      <div className="main">
        <TerminalTabBar
          sessions={terminal.sessions}
          activeSessionId={terminal.activeSessionId}
          onSelect={(id) => terminal.switchSession(id)}
          onCreate={() => terminal.createSession()}
          onClose={(id) => terminal.destroySession(id)}
        />
        <Workspace
          ref={workspaceRef}
          messages={messages}
          activeTabData={activeTab ? (messages.find(m => {
            if (m.data && typeof m.data === 'object') {
              const d = m.data as Record<string, unknown>;
              return d.path === activeTab;
            }
            return false;
          }) ?? null) : null}
          splitNodes={splitNodes}
          renderTerminalPane={renderTerminalPane}
        />
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
              setInputValue(selected.value + ' ');
              clearAutocomplete();
              inputRef.current?.focus();
            }
          }}
        />
      </div>
    </div>
  );
}
