import { useState, useCallback, useRef, useEffect } from 'react';
import { parse, isCommandInput } from './core/parser';
import { executor } from './core/executor';
import { useCommandHistory } from './hooks/useCommandHistory';
import { useAutocomplete } from './hooks/useAutocomplete';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import InputBar from './components/InputBar';
import './styles/app.css';

export interface Message {
  id: string;
  type: 'user' | 'system' | 'error';
  content: string;
  data?: unknown;
  timestamp: number;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [cwd, setCwd] = useState('~');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const { add: addHistory, up: historyUp, down: historyDown } = useCommandHistory();
  const { suggestions, selectedIndex, update: updateAutocomplete, clear: clearAutocomplete, selectNext, selectPrev } = useAutocomplete();

  const addMessage = useCallback((type: Message['type'], content: string, data?: unknown) => {
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      content,
      data,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = workspaceRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    addHistory(trimmed);
    addMessage('user', trimmed);
    setInputValue('');
    clearAutocomplete();

    const parsed = parse(trimmed);

    if (!parsed) {
      addMessage('error', `Not a valid command. Type / for available commands.`);
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
  }, [addHistory, addMessage, clearAutocomplete]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    updateAutocomplete(value);
  }, [updateAutocomplete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && !suggestions.length) {
      e.preventDefault();
      const prev = historyUp(inputValue);
      if (prev !== undefined) setInputValue(prev);
    } else if (e.key === 'ArrowDown' && !suggestions.length) {
      e.preventDefault();
      const next = historyDown(inputValue);
      if (next !== undefined) setInputValue(next);
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
  }, [inputValue, suggestions, selectedIndex, historyUp, historyDown, selectNext, selectPrev, clearAutocomplete, handleSubmit]);

  return (
    <div className="app" onClick={() => inputRef.current?.focus()}>
      <Sidebar
        cwd={cwd}
        recentFiles={recentFiles}
        openTabs={openTabs}
        activeTab={activeTab}
        activeTasks={activeTasks}
        onTabClick={(tab) => setActiveTab(tab)}
      />
      <div className="main">
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
