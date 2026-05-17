import { useState, useEffect } from 'react';

interface ProcessInfo {
  pid: number;
  command: string;
  sessionId: string;
}

interface ProcessMonitorProps {
  ws: WebSocket | null;
}

export default function ProcessMonitor({ ws }: ProcessMonitorProps) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'process-list') {
          setProcesses(msg.processes || []);
        }
      } catch {
        // ignore
      }
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const refresh = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'list-processes' }));
    }
  };

  useEffect(() => {
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [ws]);

  if (processes.length === 0 && !expanded) return null;

  return (
    <div className="process-monitor">
      <div className="process-monitor-header" onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? '\u25BC' : '\u25B6'}</span>
        <span>Processes ({processes.length})</span>
        <button className="process-refresh" onClick={(e) => { e.stopPropagation(); refresh(); }}>refresh</button>
      </div>
      {expanded && (
        <div className="process-monitor-list">
          {processes.length === 0 && (
            <div className="process-item">No background processes</div>
          )}
          {processes.map((p) => (
            <div key={p.pid} className="process-item">
              <span className="process-pid">{p.pid}</span>
              <span className="process-command">{p.command}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
