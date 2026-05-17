import { forwardRef } from 'react';
import type { Message } from '../App';
import type { Tab } from '../core/tabs/types';
import TerminalBlock from './TerminalBlock';

interface WorkspaceProps {
  messages: Message[];
  activeTab: Tab | null;
  tabs: Tab[];
}

function renderMessage(msg: Message) {
  if (msg.type === 'terminal') {
    const data = msg.data as Record<string, unknown> | undefined;
    return (
      <div key={msg.id} className="message-block user">
        <span className="prefix">{'>'}</span>
        <span className="body">{msg.content}</span>
        {data?.type === 'terminal' && (
          <TerminalBlock
            data={(data.output as string[]) || []}
            command={data.command as string}
            isRunning={data.isRunning as boolean}
          />
        )}
      </div>
    );
  }
  return (
    <div key={msg.id} className={`message-block ${msg.type}`}>
      <span className="prefix">{msg.type === 'user' ? '>' : msg.type === 'error' ? '!' : '\u2713'}</span>
      <span className="body">{msg.content}</span>
      {renderDataBlock(msg.data)}
    </div>
  );
}

const Workspace = forwardRef<HTMLDivElement, WorkspaceProps>(
  ({ messages, activeTab, tabs }: WorkspaceProps, ref) => {
    const hasMessages = messages.length > 0;
    const hasEditorTab = activeTab && activeTab.type === 'editor' && activeTab.state;

    if (hasEditorTab) {
      return (
        <div className="workspace" ref={ref}>
          {renderEditorContent(activeTab)}
        </div>
      );
    }

    if (hasMessages) {
      return (
        <div className="workspace workspace-messages" ref={ref}>
          {messages.map(renderMessage)}
        </div>
      );
    }

    return (
      <div className="workspace" ref={ref}>
        <div className="welcome">
          <div className="title">lemu</div>
          <div className="subtitle">terminal workspace</div>
          <div className="hint">
            Just type any command to run it in the shell, or <kbd>/</kbd> for internal commands
          </div>
        </div>
      </div>
    );
  }
);

function renderEditorContent(tab: Tab) {
  const state = tab.state as Record<string, unknown> | undefined;
  if (!state) return null;
  const content = state.content as string;
  const path = state.path as string;
  return (
    <div className="editor-tab-content">
      <div className="editor-tab-header">{path || tab.title}</div>
      <pre className="file-content">{content}</pre>
    </div>
  );
}

function renderDataBlock(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  return <DataView data={data as Record<string, unknown>} />;
}

function DataView({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>;
  if (d.type === 'file' && typeof d.content === 'string') {
    return <pre className="file-content">{d.content as string}</pre>;
  }
  if (d.type === 'search' && Array.isArray(d.results)) {
    return (
      <div>
        {(d.results as Array<{ file: string; line: number; content: string }>).map((r, i) => (
          <div key={i} className="search-result">
            <span className="file">{r.file}</span>
            <span className="line">:{r.line}</span>
            <span>{r.content}</span>
          </div>
        ))}
      </div>
    );
  }
  if (d.type === 'task' && Array.isArray(d.tasks)) {
    return (
      <div>
        {(d.tasks as Array<{ id: string; description: string; status: string }>).map((t) => (
          <div key={t.id} className={`task-item ${t.status === 'completed' ? 'completed' : ''}`}>
            [{t.status === 'completed' ? 'x' : ' '}] {t.description}
          </div>
        ))}
      </div>
    );
  }
  if (d.type === 'shell' && typeof d.stdout === 'string') {
    return <pre className="file-content">{(d.stdout as string) || (d.stderr as string) || '(no output)'}</pre>;
  }
  if (d.type === 'browser' && typeof d.content === 'string') {
    return (
      <div className="browser-preview">
        <div className="browser-preview-bar">{d.path as string}</div>
        <iframe
          className="browser-preview-frame"
          srcDoc={d.content as string}
          title="browser preview"
          sandbox="allow-scripts"
        />
      </div>
    );
  }
  return null;
}

export default Workspace;
