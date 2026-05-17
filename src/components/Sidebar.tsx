import type { SessionState } from '../hooks/useTerminal';

interface SidebarProps {
  cwd: string;
  recentFiles: string[];
  openTabs: string[];
  activeTab: string | null;
  activeTasks: number;
  terminalSessions: SessionState[];
  activeTerminalSession: string | null;
  onTabClick: (tab: string) => void;
  onTerminalSessionClick: (id: string) => void;
  onTerminalSessionClose: (id: string) => void;
  onNewTerminalSession: () => void;
  processes: Array<{ pid: number; command: string; sessionId: string }>;
}

export default function Sidebar({
  cwd,
  recentFiles,
  openTabs,
  activeTab,
  activeTasks,
  terminalSessions,
  activeTerminalSession,
  onTabClick,
  onTerminalSessionClick,
  onTerminalSessionClose,
  onNewTerminalSession,
  processes,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">lemu</div>

      <div className="sidebar-cwd">
        <span className="icon">{'>'}</span>
        {cwd}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">
          Terminals
          <button className="sidebar-add-btn" onClick={onNewTerminalSession} title="New terminal">+</button>
        </div>
        {terminalSessions.length === 0 && (
          <div className="sidebar-item dim">No active sessions</div>
        )}
        {terminalSessions.map((s) => (
          <div
            key={s.id}
            className={`sidebar-item ${activeTerminalSession === s.id ? 'active' : ''}`}
            onClick={() => onTerminalSessionClick(s.id)}
          >
            <span className="icon">{'\u25A3'}</span>
            <span className="sidebar-item-label">{s.label || s.shellType || 'terminal'}</span>
            <button
              className="sidebar-item-close"
              onClick={(e) => { e.stopPropagation(); onTerminalSessionClose(s.id); }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">Processes ({processes.length})</div>
        {processes.length === 0 && (
          <div className="sidebar-item dim">No background processes</div>
        )}
        {processes.map((p) => (
          <div key={p.pid} className="sidebar-item">
            <span className="icon">{'\u25CF'}</span>
            <span className="sidebar-item-label">{p.command}</span>
            <span className="sidebar-item-meta">{p.pid}</span>
          </div>
        ))}
      </div>

      {openTabs.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Open Files</div>
          {openTabs.map((tab) => (
            <div
              key={tab}
              className={`sidebar-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => onTabClick(tab)}
            >
              <span className="icon">{'\u25C9'}</span>
              {tab}
            </div>
          ))}
        </div>
      )}

      {recentFiles.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Recent Files</div>
          {recentFiles.map((file) => (
            <div key={file} className="sidebar-item" onClick={() => onTabClick(file)}>
              <span className="icon">{'\u25CB'}</span>
              {file}
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-title">Tasks</div>
        <div className="sidebar-item">
          <span className="icon">{'\u25A0'}</span>
          {activeTasks} task{activeTasks !== 1 ? 's' : ''}
        </div>
      </div>
    </aside>
  );
}
