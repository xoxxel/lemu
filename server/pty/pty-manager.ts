import { ShellSession, type SessionOptions, type SessionState } from './shell-session';

class PTYManager {
  private sessions = new Map<string, ShellSession>();
  private activeSessionId: string | null = null;

  createSession(options: SessionOptions = {}): ShellSession {
    const id = `pty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session = new ShellSession(id, options);
    this.sessions.set(id, session);
    this.activeSessionId = id;
    return session;
  }

  getSession(id: string): ShellSession | undefined {
    return this.sessions.get(id);
  }

  getActiveSession(): ShellSession | undefined {
    if (this.activeSessionId) {
      return this.sessions.get(this.activeSessionId);
    }
    return undefined;
  }

  setActiveSession(id: string): boolean {
    if (this.sessions.has(id)) {
      this.activeSessionId = id;
      return true;
    }
    return false;
  }

  ensureActiveSession(options: SessionOptions = {}): ShellSession {
    const existing = this.getActiveSession();
    if (existing) return existing;
    return this.createSession(options);
  }

  destroySession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    session.kill();
    this.sessions.delete(id);
    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions.keys().next().value || null;
    }
    return true;
  }

  destroyAll(): void {
    for (const [id, session] of this.sessions) {
      session.kill();
      this.sessions.delete(id);
    }
    this.activeSessionId = null;
  }

  listSessions(): SessionState[] {
    return Array.from(this.sessions.values()).map((s) => s.getState());
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }
}

export const ptyManager = new PTYManager();
