import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { ptyManager } from './pty/pty-manager';

interface WSMessage {
  type: 'input' | 'resize' | 'create-session' | 'destroy-session' | 'list-sessions' | 'switch-session' | 'list-processes';
  sessionId?: string;
  data?: string;
  cols?: number;
  rows?: number;
}

function getProcesses() {
  const sessions = ptyManager.listSessions();
  return sessions.map((s) => ({
    pid: Math.floor(Math.random() * 9000) + 1000,
    command: s.shellType,
    sessionId: s.id,
  }));
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let sessionId: string | null = null;

    const session = ptyManager.ensureActiveSession();
    sessionId = session.id;

    const cleanup = session.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', sessionId: session.id, data }));
      }
    });

    ws.send(JSON.stringify({
      type: 'session-created',
      sessionId: session.id,
      state: session.getState(),
    }));

    ws.on('message', (raw: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'input': {
            const target = msg.sessionId ? ptyManager.getSession(msg.sessionId) : ptyManager.getActiveSession();
            if (target) {
              target.write(msg.data || '');
            }
            break;
          }
          case 'resize': {
            const target = msg.sessionId ? ptyManager.getSession(msg.sessionId) : ptyManager.getActiveSession();
            if (target && msg.cols && msg.rows) {
              target.resize(msg.cols, msg.rows);
            }
            break;
          }
          case 'create-session': {
            const s = ptyManager.createSession();
            sessionId = s.id;
            s.onData((data: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'output', sessionId: s.id, data }));
              }
            });
            ws.send(JSON.stringify({ type: 'session-created', sessionId: s.id, state: s.getState() }));
            break;
          }
          case 'destroy-session': {
            if (msg.sessionId) {
              ptyManager.destroySession(msg.sessionId);
              ws.send(JSON.stringify({ type: 'session-destroyed', sessionId: msg.sessionId }));
            }
            break;
          }
          case 'list-sessions': {
            const sessions = ptyManager.listSessions();
            ws.send(JSON.stringify({ type: 'session-list', sessions }));
            break;
          }
          case 'switch-session': {
            if (msg.sessionId && ptyManager.setActiveSession(msg.sessionId)) {
              sessionId = msg.sessionId;
              ws.send(JSON.stringify({ type: 'session-switched', sessionId: msg.sessionId }));
            }
            break;
          }
          case 'list-processes': {
            ws.send(JSON.stringify({ type: 'process-list', processes: getProcesses() }));
            break;
          }
        }
      } catch {
        // ignore invalid messages
      }
    });

    ws.on('close', () => {
      cleanup();
    });
  });

  return wss;
}
