import { forwardRef } from 'react';
import type { Message } from '../App';
import type { Tab } from '../core/tabs/types';

interface WorkspaceProps {
  messages: Message[];
  activeTab: Tab | null;
  tabs: Tab[];
}

function renderEditorContent(state: Record<string, unknown>) {
  const content = state.content as string;
  const path = state.path as string;
  return (
    <>
      <div className="editor-tab-header">{path || 'Untitled'}</div>
      <pre className="file-content">{content}</pre>
    </>
  );
}

function renderBrowserContent(state: Record<string, unknown>) {
  const content = state.content as string;
  const path = state.path as string;
  return (
    <div className="browser-preview">
      <div className="browser-preview-bar">{path || 'Preview'}</div>
      <iframe
        className="browser-preview-frame"
        srcDoc={content}
        title="browser preview"
        sandbox="allow-scripts"
      />
    </div>
  );
}

function renderSearchContent(state: Record<string, unknown>) {
  const results = state.results as Array<{ file: string; line: number; content: string }> | undefined;
  if (!results || results.length === 0) {
    return <div className="empty-state">No results</div>;
  }
  return (
    <div className="search-results-list">
      <div className="search-results-header">Found {results.length} result(s)</div>
      {results.map((r, i) => (
        <div key={i} className="search-result">
          <span className="file">{r.file}</span>
          <span className="line">:{r.line}</span>
          <span>{r.content}</span>
        </div>
      ))}
    </div>
  );
}

function renderTaskContent(state: Record<string, unknown>) {
  const tasks = state.tasks as Array<{ id: string; description: string; status: string }> | undefined;
  if (!tasks || tasks.length === 0) {
    return <div className="empty-state">No tasks.</div>;
  }
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <div key={t.id} className={`task-item ${t.status === 'completed' ? 'completed' : ''}`}>
          [{t.status === 'completed' ? 'x' : ' '}] {t.description}
        </div>
      ))}
    </div>
  );
}

function renderShellContent(state: Record<string, unknown>) {
  const stdout = state.stdout as string;
  const stderr = state.stderr as string;
  const command = state.command as string;
  const output = [stdout, stderr].filter(Boolean).join('\n');
  if (!output) return <div className="empty-state">(no output)</div>;
  return (
    <div className="shell-output">
      {command && <div className="shell-output-header">{'> '}{command}</div>}
      <pre className="file-content">{output}</pre>
    </div>
  );
}

function renderAIContent(state: Record<string, unknown>) {
  const content = state.content as string;
  if (!content) return <div className="empty-state">(no response)</div>;
  return (
    <div className="ai-response">
      <div className="ai-response-header">AI Response</div>
      <div className="ai-response-body">{content}</div>
    </div>
  );
}

function renderAgentContent(state: Record<string, unknown>) {
  const content = state.content as string;
  const logs = state.logs as string[] | undefined;
  return (
    <div className="agent-response">
      {content && <div className="agent-response-body">{content}</div>}
      {logs && logs.length > 0 && (
        <div className="agent-logs">
          <div className="agent-logs-header">Agent Steps ({logs.length})</div>
          {logs.map((log, i) => (
            <div key={i} className="agent-log-line">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMessageLine(msg: Message) {
  const body = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
  return (
    <div key={msg.id} className={`history-line ${msg.type}`}>
      <span className="history-prefix">
        {msg.type === 'user' ? '>' : msg.type === 'error' ? '!' : '\u2713'}
      </span>
      <span className="history-body">{body}</span>
    </div>
  );
}

function renderHomeContent(messages: Message[]) {
  if (messages.length === 0) {
    return (
      <div className="welcome">
        <div className="title">lemu</div>
        <div className="subtitle">terminal workspace</div>
        <div className="hint">
          Type any command for the shell, <kbd>/</kbd> for internal commands, or <kbd>@command</kbd> for instant help
        </div>
      </div>
    );
  }
  return (
    <div className="home-content">
      <div className="home-header">
        <span className="home-header-title">lemu</span>
        <span className="home-header-history-count">{messages.length} command{messages.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="home-history">{messages.map(renderMessageLine)}</div>
    </div>
  );
}

function renderTabContent(tab: Tab, messages: Message[]): JSX.Element | null {
  const state = tab.state as Record<string, unknown> | undefined;
  if (!state && tab.type !== 'home') return null;

  switch (tab.type) {
    case 'home':
      return renderHomeContent(messages);
    case 'editor':
      return renderEditorContent(state!);
    case 'browser':
      return renderBrowserContent(state!);
    case 'search':
      return renderSearchContent(state!);
    case 'task':
      return renderTaskContent(state!);
    case 'shell':
      return renderShellContent(state!);
    case 'ai':
      return renderAIContent(state!);
    case 'agent':
      return renderAgentContent(state!);
    default:
      return <div className="empty-state">No content for this tab type.</div>;
  }
}

const Workspace = forwardRef<HTMLDivElement, WorkspaceProps>(
  ({ messages, activeTab }: WorkspaceProps, ref) => {
    return (
      <div className="workspace" ref={ref}>
        <div className="workspace-tab-content">
          {activeTab ? renderTabContent(activeTab, messages) : (
            <div className="welcome">
              <div className="title">lemu</div>
              <div className="subtitle">terminal workspace</div>
              <div className="hint">
                Type any command for the shell, <kbd>/</kbd> for internal commands, or <kbd>@command</kbd> for instant help
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default Workspace;
