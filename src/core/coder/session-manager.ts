import { AISession } from './session';

export class AISessionManager {
  private _activeSession: AISession | null = null;
  private _history: AISession[] = [];
  private _maxHistory = 10;

  get activeSession(): AISession | null {
    return this._activeSession;
  }

  get hasActiveSession(): boolean {
    return this._activeSession !== null && !this._activeSession.closed;
  }

  startSession(session: AISession): void {
    if (this._activeSession && !this._activeSession.closed) {
      this._activeSession.close();
    }
    if (this._activeSession) {
      this._history.push(this._activeSession);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
    }
    this._activeSession = session;
  }

  endSession(): void {
    if (this._activeSession && !this._activeSession.closed) {
      this._activeSession.close();
    }
    this._activeSession = null;
  }

  getSession(sessionId: string): AISession | null {
    if (this._activeSession?.sessionId === sessionId) return this._activeSession;
    return this._history.find(s => s.sessionId === sessionId) ?? null;
  }

  get history(): readonly AISession[] {
    return [...this._history];
  }

  clear(): void {
    if (this._activeSession && !this._activeSession.closed) {
      this._activeSession.close();
    }
    this._activeSession = null;
    this._history = [];
  }
}
