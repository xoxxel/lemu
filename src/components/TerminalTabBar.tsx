import type { SessionState } from '../hooks/useTerminal';

interface TerminalTabBarProps {
  sessions: SessionState[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onClose: (id: string) => void;
}

export default function TerminalTabBar({ sessions, activeSessionId, onSelect, onCreate, onClose }: TerminalTabBarProps) {
  return (
    <div className="terminal-tab-bar">
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`terminal-tab ${activeSessionId === s.id ? 'active' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="terminal-tab-label">{s.label || s.shellType}</span>
          <span className="terminal-tab-close" onClick={(e) => { e.stopPropagation(); onClose(s.id); }}>
            &times;
          </span>
        </div>
      ))}
      <div className="terminal-tab terminal-tab-new" onClick={onCreate}>
        <span className="terminal-tab-label">+</span>
      </div>
    </div>
  );
}
