import { useState, useRef, useEffect, useCallback } from 'react';

export interface SessionState {
  id: string;
  cwd: string;
  shellType: string;
  createdAt: number;
  label?: string;
}

export interface WSMessage {
  type: string;
  sessionId?: string;
  data?: string;
  state?: SessionState;
  sessions?: SessionState[];
  processes?: Array<{ pid: number; command: string; sessionId: string }>;
  [key: string]: unknown;
}

export function useTerminal() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlers = useRef<Set<(msg: WSMessage) => void>>(new Set());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'session-created') {
          const sid = msg.sessionId as string;
          const state = msg.state as SessionState | undefined;
          setSessionId(sid);
          setActiveSessionId(sid);
          if (state) {
            setSessions((prev) => {
              if (prev.find((s) => s.id === sid)) return prev;
              return [...prev, state];
            });
          }
        }

        if (msg.type === 'session-destroyed') {
          const sid = msg.sessionId as string;
          setSessions((prev) => prev.filter((s) => s.id !== sid));
          setActiveSessionId((prev) => prev === sid ? null : prev);
        }

        if (msg.type === 'session-switched') {
          setActiveSessionId(msg.sessionId as string);
        }

        if (msg.type === 'session-list') {
          setSessions((msg.sessions as SessionState[]) || []);
        }

        for (const handler of messageHandlers.current) {
          handler(msg);
        }
      } catch {
        // ignore
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendInput = useCallback((input: string, targetSessionId?: string) => {
    sendMessage({
      type: 'input',
      sessionId: targetSessionId || activeSessionId,
      data: input + '\r',
    });
  }, [sendMessage, activeSessionId]);

  const onMessage = useCallback((handler: (msg: WSMessage) => void) => {
    messageHandlers.current.add(handler);
    return () => { messageHandlers.current.delete(handler); };
  }, []);

  const resize = useCallback((cols: number, rows: number, targetSessionId?: string) => {
    sendMessage({
      type: 'resize',
      sessionId: targetSessionId || activeSessionId,
      cols,
      rows,
    });
  }, [sendMessage, activeSessionId]);

  const createSession = useCallback(() => {
    sendMessage({ type: 'create-session' });
  }, [sendMessage]);

  const destroySession = useCallback((sid: string) => {
    sendMessage({ type: 'destroy-session', sessionId: sid });
  }, [sendMessage]);

  const switchSession = useCallback((sid: string) => {
    sendMessage({ type: 'switch-session', sessionId: sid });
    setActiveSessionId(sid);
  }, [sendMessage]);

  const listSessions = useCallback(() => {
    sendMessage({ type: 'list-sessions' });
  }, [sendMessage]);

  return {
    ws,
    sessionId,
    sessions,
    activeSessionId,
    isConnected,
    sendInput,
    onMessage,
    resize,
    createSession,
    destroySession,
    switchSession,
    listSessions,
  };
}
