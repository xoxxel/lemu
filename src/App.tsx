import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { parse } from './core/parser';
import { classifyInput } from './core/input-router';
import { getRuntime } from './core/runtime/instance';
import type { PluginInputResult, CommandScope } from './core/plugin-system/types';
import { resolveScope, getScopePlaceholder } from './core/scope/scope-resolver';
import type { ParsedCommand } from './core/commands/types';
import { registry } from './core/commands/registry';
import { parser as grammarParser } from './core/grammar/parser';
import { nodeToLegacyPayload, commandNodeToParsedCommand } from './core/grammar/adapter';
import type { AstNode, CommandNode, ActionNode, HelpNode, TerminalNode, SequenceNode, PipeNode } from './core/grammar/types';
import { useCommandHistory } from './hooks/useCommandHistory';
import { useAutocomplete } from './hooks/useAutocomplete';
import { useTerminal } from './hooks/useTerminal';
import type { Tab } from './core/tabs/types';
import { createTabId } from './core/tabs/types';

import type { FeedbackEvent } from './core/feedback/types';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import { AiPanel } from './components/AiPanel';
import InputBar from './components/InputBar';
import type { InputMode } from './components/InputBar';
import FeedbackBar from './components/FeedbackBar';
import { OperationalFeed } from './components/OperationalFeed';
import TerminalTabBar from './components/TerminalTabBar';
import TerminalOutput from './components/TerminalOutput';
import MainTabBar from './components/MainTabBar';
import './styles/app.css';

function isActionNode(n: AstNode | null): n is ActionNode { return n?.type === 'action'; }
function isCommandNode(n: AstNode | null): n is CommandNode { return n?.type === 'command'; }
function isHelpNode(n: AstNode | null): n is HelpNode { return n?.type === 'help'; }
function isTerminalNode(n: AstNode | null): n is TerminalNode { return n?.type === 'terminal'; }

interface GrammarClassified {
  mode: 'command' | 'action' | 'help' | 'terminal' | 'tab';
  input: string;
  raw: string;
  global?: boolean;
  node: AstNode | null;
}

function grammarClassify(raw: string): GrammarClassified {
  const trimmed = raw.trim();
  if (!trimmed) return { mode: 'tab', input: '', raw, node: null };

  // Handle ! prefix (legacy exec command) — grammar parser doesn't tokenize ! as prefix
  if (trimmed.startsWith('!')) {
    return { mode: 'command', input: trimmed, raw, node: null };
  }

  const result = grammarParser.parse(trimmed);
  const node = result.node;

  if (isActionNode(node)) {
    return { mode: 'action', input: node.query, raw, global: node.global, node };
  }

  if (isCommandNode(node)) {
    return { mode: 'command', input: node.raw, raw, node };
  }

  if (isHelpNode(node)) {
    return { mode: 'help', input: node.topic, raw, node };
  }

  if (isTerminalNode(node)) {
    return { mode: 'terminal', input: node.command, raw, node };
  }

  // Sequence/Pipe — use adapter
  if (node && (node.type === 'sequence' || node.type === 'pipe')) {
    return { mode: 'command', input: node.raw, raw, node };
  }

  // Literal (plain text) → tab
  return { mode: 'tab', input: trimmed, raw, node };
}

function applyAutocomplete(input: string, selected: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('*>')) {
    const after = selected.startsWith('*>') ? selected.slice(2) : selected;
    return '*>' + after + ' ';
  }
  if (trimmed.startsWith('@') || trimmed.startsWith('>')) {
    return selected + ' ';
  }
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
  const feedRef = useRef<{ clearAll: () => void }>(null);
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(false);
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<FeedbackEvent | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const { add: addHistory, up: historyUp, down: historyDown, reset: resetHistory, isNavigating } = useCommandHistory();
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;
  const activeTabType = tabs.find((t) => t.id === activeTabId)?.type ?? null;
  const prevEditorCtx = useRef<string>('');
  if (activeTab?.type === 'editor') {
    const s = activeTab.state as Record<string, unknown>;
    const doc = (s.content as string) || '';
    if (prevEditorCtx.current !== doc) {
      prevEditorCtx.current = doc;
      getRuntime().editorContext.document = doc;
      getRuntime().editorContext.path = (s.path as string) || '';
      getRuntime().editorContext.state = s;
    }
  }
  const activePlugin = activeTabType ? getRuntime().pluginRegistry.getPluginByTabType(activeTabType) : null;
  const { scope: activeScope } = resolveScope(inputValue, activePlugin);
  const { suggestions, selectedIndex, statusText, update: updateAutocomplete, clear: clearAutocomplete, selectNext, selectPrev, selectCurrent } = useAutocomplete(activeScope, activePlugin);

  /* ── AI Panel visibility ── */
  const [aiPanelOpen, setAiPanelOpen] = useState(() => getRuntime().aiSessions.hasActiveSession);
  const _aiSessionTick = useSyncExternalStore(
    (cb) => { const id = setInterval(cb, 200); return () => clearInterval(id); },
    () => getRuntime().aiSessions.hasActiveSession ? 1 : 0,
  );
  if (!aiPanelOpen && getRuntime().aiSessions.hasActiveSession) {
    setAiPanelOpen(true);
  }
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

  const handleTabInput = useCallback(async (input: string, tab: Tab): Promise<void> => {
    const runtime = getRuntime();
    const plugin = runtime.pluginRegistry.getPluginByTabType(tab.type);
    if (!plugin || !plugin.onInput) {
      addMessage('user', input);
      const label = runtime.viewMetaMap[tab.type]?.label ?? tab.type;
      addMessage('error', `${label} does not accept direct input. Use : for terminal, / for commands, or > for actions.`);
      runtime.feedback.show({
        level: 'warning',
        message: `'${label}' tab does not accept direct input`,
        suggestion: 'Use : for terminal, / for commands, > for actions',
        dismissible: true,
      });
      return;
    }
    addMessage('user', input);
    const result: PluginInputResult | void = await runtime.processPluginInput({
      input,
      tabId: tab.id,
      tabType: tab.type,
      state: tab.state ?? {},
    });
    if (result) {
      if (result.message) {
        addMessage('system', result.message);
      }
      if (result.openTab) {
        const ot = result.openTab;
        const viewMeta = runtime.viewMetaMap;
        const meta = viewMeta[ot.type];
        addTab(ot.type, ot.title ?? meta?.label ?? ot.type, undefined, ot.state);
      }
      if (result.state) {
        setTabs((prev) => prev.map((t) =>
          t.id === tab.id ? { ...t, state: { ...t.state, ...result.state } } : t
        ));
      }
    }
  }, [addMessage, addTab]);

  const handleSubmit = useCallback(async (input: string) => {
    const runtime = getRuntime();
    const trimmed = input.trim();

    /* ── Ownership gate: root/system prefixes ALWAYS bypass ownership ── */
    const hasRootPrefix = trimmed.startsWith('/') || trimmed.startsWith(':') || trimmed.startsWith('@');
    const hasActionPrefix = trimmed.startsWith('>') || trimmed.startsWith('*>');

    if (hasRootPrefix) {
      /* / : @ — release ownership and route normally */
      if (runtime.ownership.hasOwner()) runtime.ownership.releaseOnRootTrigger();
    } else if (hasActionPrefix) {
      /* > *> — bypass ownership but DO NOT release (action handlers may toggle) */
    } else if (runtime.ownership.hasOwner()) {
      /* Plain text while owned — route directly to the owning plugin */
      const owner = runtime.ownership.getOwner()!;
      const plugin = runtime.pluginRegistry.get(owner.pluginId);
      if (plugin?.onInput) {
        addMessage('user', trimmed);
        const tab = tabs.find(t => t.id === owner.tabId);
        const result: PluginInputResult | void = await runtime.processPluginInput({
          input: trimmed,
          tabId: owner.tabId ?? '',
          tabType: owner.tabType,
          state: tab?.state ?? {},
        });
        if (result?.state) {
          setTabs((prev) => prev.map((t) =>
            t.id === owner.tabId ? { ...t, state: { ...t.state, ...result.state } } : t
          ));
        }
        return;
      }
      /* Owner plugin gone — clean up and fall through */
      runtime.ownership.release();
    }

    const classified = grammarClassify(input);
    const { mode, input: routedInput, raw, node } = classified;
    if (!routedInput && mode !== 'tab' && !node) return;

    addHistory(raw);
    setInputValue('');
    clearAutocomplete();

    if (mode === 'action') {
      const isGlobal = classified.global === true;
      const runtime = getRuntime();

      /* ── Empty query: list actions for current scope only ── */
      if (!routedInput) {
        addMessage('user', raw);
        if (isGlobal) {
          const actions = runtime.actionRegistry.getGlobal();
          const body = actions.length > 0
            ? actions.map(a => `  *>${a.id}  ${a.title ?? ''}`).join('\n')
            : '  No global actions available.';
          addMessage('system', `Global actions:\n${body}`);
        } else if (activeTab) {
          const actions = runtime.actionRegistry.getScoped(activeTab.type);
          const body = actions.length > 0
            ? actions.map(a => `  >${a.id}  ${a.title ?? ''}`).join('\n')
            : `  No actions for ${activeTab.type}`;
          addMessage('system', `Actions for ${activeTab.type}:\n${body}`);
        } else {
          addMessage('system', 'Open a plugin tab first (e.g. /edit file.ts), then use > for its actions.');
        }
        return;
      }

      let action: import('./core/actions/types').PluginAction | undefined;

      /* ── *> scope: ONLY global actions, NEVER plugin ── */
      if (isGlobal) {
        action = runtime.actionRegistry.findGlobal(routedInput);
        if (!action) {
          const globalActions = runtime.actionRegistry.getGlobal();
          const prefix = routedInput.split(' ')[0];
          action = globalActions.find(a =>
            a.aliases?.some(al => al.toLowerCase() === routedInput.toLowerCase())
          ) || globalActions.find(a => a.id === prefix);
          /* still restrict to global only — never touch scoped */
          if (action && !globalActions.includes(action)) action = undefined;
        }
      }
      /* ── > scope: ONLY plugin actions, NEVER global ── */
      else if (activeTab) {
        action = runtime.actionRegistry.findScoped(activeTab.type, routedInput);
        if (!action) {
          const allActions = runtime.actionRegistry.getScoped(activeTab.type);
          action = allActions.find(a =>
            a.aliases?.some(al => al.toLowerCase() === routedInput.toLowerCase())
          );
        }
        if (!action) {
          const allActions = runtime.actionRegistry.getScoped(activeTab.type);
          const prefix = routedInput.split(' ')[0];
          action = allActions.find(a => a.id === prefix);
        }
      }
      /* ── > with no active tab: instruct, never show global ── */
      else {
        addMessage('user', raw);
        addMessage('error', 'No plugin tab active. Open a file first (e.g. /edit file.ts), then use > for its actions.');
        return;
      }

      /* ── Primary input channel (plugin-defined structured input, not an action) ── */
      if (!action && activeTab) {
        const activePlugin = runtime.pluginRegistry.getPluginByTabType(activeTab.type);
        if (activePlugin?.interaction?.primaryInput?.enabled) {
          addMessage('user', raw);
          if (activePlugin.onInput) {
            const result = await runtime.processPluginInput({
              input: routedInput,
              tabId: activeTab.id,
              tabType: activeTab.type,
              state: activeTab.state ?? {},
            });
            if (result) {
              if (result.message) addMessage('system', result.message);
              if (result.state) {
                setTabs(prev => prev.map(t =>
                  t.id === activeTab.id ? { ...t, state: { ...t.state, ...result.state } } : t
                ));
              }
              if (result.openTab) {
                const ot = result.openTab;
                const viewMeta = runtime.viewMetaMap;
                const meta = viewMeta[ot.type];
                addTab(ot.type, ot.title ?? meta?.label ?? ot.type, undefined, ot.state);
              }
              return;
            }
          }
          /* fallback: use the focus action as default primary input handler */
          const focus = runtime.actionRegistry.findScoped(activeTab.type, 'focus');
          if (focus) {
            action = focus;
          }
        }
      }

      if (!action) {
        addMessage('user', raw);
        const hint = isGlobal
          ? 'Type *> to list global actions.'
          : `Type > to list actions for ${activeTab?.type ?? 'this tab'}.`;
        addMessage('error', `No action '${routedInput}'. ${hint}`);
        runtime.feedback.show({
          level: 'error',
          message: `No action '${routedInput}'`,
          suggestion: hint,
          dismissible: true,
        });
        return;
      }

      console.log('[ACTIONS] selected:', action.id);
      addMessage('user', raw);
      const tab = activeTab;
      const ctx = {
        tabId: tab?.id ?? null,
        tabType: tab?.type ?? null,
        tabState: tab?.state ?? {},
        query: routedInput,
        pinned: tab ? pinnedTabs.has(tab.id) : false,
        pin: () => tab && togglePinTab(tab.id),
        unpin: () => tab && togglePinTab(tab.id),
        addTab: (type: string, title: string, state?: Record<string, unknown>) =>
          addTab(type, title, undefined, state),
        setState: (patch: Record<string, unknown>) => {
          if (tab) setTabs(prev => prev.map(t =>
            t.id === tab.id ? { ...t, state: { ...t.state, ...patch } } : t
          ));
        },
      };
      try {
        const result = await action.handler(ctx);
        addMessage('system', result);
        /* ── Ownership acquisition: action claims subsequent plain text ── */
        if (action.ownsInput && tab) {
          runtime.ownership.acquire(activePlugin?.id ?? '', action.id, tab.type, tab.id);
          const searchMode = getRuntime().getContext().get<boolean>('edit:search:mode');
          if (action.id === 'find' && searchMode === false) {
            runtime.ownership.release();
          }
        }
      } catch (err) {
        const msg = `Action error: ${err instanceof Error ? err.message : String(err)}`;
        addMessage('error', msg);
        runtime.feedback.show({ level: 'error', message: msg, dismissible: true });
      }
      return;
    }

    if (mode === 'help') {
      addMessage('user', raw);
      if (!routedInput) {
        addMessage('system', 'Usage: @<plugin|command> \u2014 e.g. @open, @search, @git');
        return;
      }
      const result = await getRuntime().execute({ name: 'help', args: [routedInput], raw });
      addMessage(result.success ? 'system' : 'error', result.message);
      if (result.success && result.data && typeof result.data === 'object') {
        const d = result.data as Record<string, unknown>;
        const dType = d.type as string | undefined;
        if (dType && getRuntime().viewComponentMap[dType]) {
          addTab(dType, `help: ${routedInput}`, undefined, d);
        }
      }
      return;
    }

    if (mode === 'command') {
      addMessage('user', raw);

      let parsed: ParsedCommand | null = null;

      if (node && (node.type === 'command' || node.type === 'sequence' || node.type === 'pipe')) {
        parsed = commandNodeToParsedCommand(node);
      } else {
        parsed = parse(routedInput);
      }

      if (!parsed || !parsed.name) {
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

        /* ── Open AI panel when /coder returns session data ── */
        if (d.aiContext && typeof d.aiContext === 'object') {
          setAiPanelOpen(true);
        }

        if (dType && getRuntime().viewComponentMap[dType]) {
          if (activeTab && activeTab.type === dType) {
            setTabs((prev) => prev.map((t) =>
              t.id === activeTab.id
                ? { ...t, state: { ...t.state, ...d }, title: (d.path as string) || parsed.name }
                : t
            ));
          } else {
            const title = (d.path as string) || (d.command as string) || parsed.name;
            addTab(dType, title, d.path as string | undefined, d);
          }
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

    if (mode === 'terminal') {
      await handleShellCommand(routedInput);
      return;
    }

    if (mode === 'tab') {
      if (!activeTab) {
        addMessage('user', raw);
        addMessage('error', 'No active tab. Open a file or view first, or use : for terminal, / for commands, @ for help.');
        getRuntime().feedback.show({
          level: 'warning',
          message: 'No active tab to receive input',
          suggestion: 'Use / to open a file, : for terminal, or @ for help',
          dismissible: true,
        });
        return;
      }
      await handleTabInput(routedInput, activeTab);
      return;
    }
  }, [addHistory, addMessage, clearAutocomplete, terminal, handleShellCommand, addTab, activeTab, pinnedTabs, togglePinTab, handleTerminalCommand, handleTabInput, tabs]);

  const dismissFeedback = useCallback(() => {
    getRuntime().feedback.clear();
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    feedRef.current?.clearAll();
    if (getRuntime().feedback.currentFeedback) {
      getRuntime().feedback.clear();
    }
    if (value.startsWith('/') || value.startsWith('>') || value.startsWith('*>') || value.startsWith(':') || value.startsWith('@')) {
      updateAutocomplete(value);
    } else if (getRuntime().ownership.hasOwner()) {
      /* Ownership mode: still show autocomplete for prefix triggers */
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

    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      /* Shift+Enter in find mode = previous match */
      if (getRuntime().ownership.hasOwner() && getRuntime().ownership.getOwner()?.pluginId === 'fs') {
        handleSubmit('k');
      } else {
        handleSubmit(inputValue);
      }
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

  const inputMode: InputMode = inputValue.trim().startsWith('/') || inputValue.trim().startsWith('!')
    ? 'command'
    : inputValue.trim().startsWith(':')
      ? 'terminal'
      : 'normal';

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
        <div className="editor-area">
          <Workspace
            ref={workspaceRef}
            activeTab={activeTab}
          />
          {aiPanelOpen && <AiPanel state={{}} />}
        </div>
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
        <OperationalFeed ref={feedRef} />
        <InputBar
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          hint={statusText}
          mode={inputMode}
          ownedModeLabel={(() => {
            const owner = getRuntime().ownership.getOwner();
            if (!owner) return undefined;
            if (owner.actionId === 'find') return 'find mode';
            return `${owner.actionId} mode`;
          })()}
          ownedModeActive={!!getRuntime().ownership.getOwner()}
          customPlaceholder={(() => {
            const owner = getRuntime().ownership.getOwner();
            if (owner && owner.pluginId === 'fs') {
              return inputValue.startsWith('>') || inputValue.startsWith('*>')
                ? 'choose action — or j/k to navigate matches'
                : 'Find text in document...';
            }
            return getScopePlaceholder(activeScope, activePlugin);
          })()}
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
