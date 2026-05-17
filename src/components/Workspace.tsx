import { forwardRef } from 'react';
import type { Message } from '../App';
import TerminalBlock from './TerminalBlock';
import SplitPane from './SplitPane';
import type { SplitNode } from './SplitPane';

interface WorkspaceProps {
  messages: Message[];
  activeTabData: Message | null;
  splitNodes?: SplitNode[];
  renderTerminalPane?: (sessionId: string, nodeId: string) => React.ReactNode;
}

const Workspace = forwardRef<HTMLDivElement, WorkspaceProps>(
  ({ messages, splitNodes, renderTerminalPane }: WorkspaceProps, ref) => {
    if (splitNodes && splitNodes.length > 0 && renderTerminalPane) {
      return (
        <div className="workspace" ref={ref}>
          {splitNodes.length === 1 ? (
            <div className="workspace-terminal-full">
              <SplitPane
                node={splitNodes[0]}
                onSplit={() => {}}
                onClose={() => {}}
                renderTerminal={renderTerminalPane}
              />
            </div>
          ) : (
            <div className="workspace-split-container">
              {splitNodes.map((node) => (
                <div key={node.id} className="workspace-split-pane" style={{ flex: 1 }}>
                  <SplitPane
                    node={node}
                    onSplit={() => {}}
                    onClose={() => {}}
                    renderTerminal={renderTerminalPane}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (messages.length === 0) {
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

    return (
      <div className="workspace" ref={ref}>
        {messages.map((msg) => {
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
        })}
      </div>
    );
  }
);

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
  return null;
}

export default Workspace;
