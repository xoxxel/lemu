import * as pty from 'node-pty';
import * as path from 'path';
import * as os from 'os';

export interface SessionOptions {
  cwd?: string;
  cols?: number;
  rows?: number;
}

export interface SessionState {
  id: string;
  cwd: string;
  shellType: string;
  createdAt: number;
}

export class ShellSession {
  public readonly id: string;
  public readonly ptyProcess: pty.IPty;
  public readonly createdAt: number;
  public cwd: string;
  public shellType: string;
  public outputBuffer: string[] = [];
  public activeProcesses: string[] = [];
  public commandHistory: string[] = [];

  private dataHandlers: Set<(data: string) => void> = new Set();
  private exitHandlers: Set<() => void> = new Set();

  constructor(id: string, options: SessionOptions = {}) {
    this.id = id;
    this.createdAt = Date.now();

    const isWindows = os.platform() === 'win32';
    const shell = isWindows
      ? process.env.SHELL || 'powershell.exe'
      : process.env.SHELL || '/bin/bash';

    const shellArgs = isWindows ? [] : ['--login'];
    const cwd = options.cwd || process.cwd();

    this.ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: options.cols || 120,
      rows: options.rows || 40,
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
      },
    });

    this.cwd = cwd;
    this.shellType = path.basename(shell);

    this.ptyProcess.onData((data) => {
      this.outputBuffer.push(data);
      if (this.outputBuffer.length > 1000) {
        this.outputBuffer.splice(0, 200);
      }
      for (const handler of this.dataHandlers) {
        handler(data);
      }
    });

    this.ptyProcess.onExit(() => {
      for (const handler of this.exitHandlers) {
        handler();
      }
    });
  }

  write(data: string): void {
    this.ptyProcess.write(data);
  }

  resize(cols: number, rows: number): void {
    this.ptyProcess.resize(cols, rows);
  }

  onData(handler: (data: string) => void): () => void {
    this.dataHandlers.add(handler);
    return () => this.dataHandlers.delete(handler);
  }

  onExit(handler: () => void): () => void {
    this.exitHandlers.add(handler);
    return () => this.exitHandlers.delete(handler);
  }

  getState(): SessionState {
    return {
      id: this.id,
      cwd: this.cwd,
      shellType: this.shellType,
      createdAt: this.createdAt,
    };
  }

  kill(): void {
    this.dataHandlers.clear();
    this.exitHandlers.clear();
    this.ptyProcess.kill();
  }
}
