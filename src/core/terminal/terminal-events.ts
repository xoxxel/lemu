export interface TerminalOutputEvent {
  type: 'terminal-output';
  sessionId: string;
  data: string;
  timestamp: number;
}

export interface TerminalInputEvent {
  type: 'terminal-input';
  sessionId: string;
  data: string;
  timestamp: number;
}

export interface TerminalSessionEvent {
  type: 'terminal-session';
  sessionId: string;
  action: 'created' | 'destroyed' | 'resized';
  cols?: number;
  rows?: number;
  timestamp: number;
}

export interface TerminalCommandEvent {
  type: 'terminal-command';
  sessionId: string;
  command: string;
  exitCode: number | null;
  timestamp: number;
}

export type TerminalEvent =
  | TerminalOutputEvent
  | TerminalInputEvent
  | TerminalSessionEvent
  | TerminalCommandEvent;

export const SESSION_START_PROMPT = '\r\n';
