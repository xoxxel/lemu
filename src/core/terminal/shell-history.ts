const MAX_ENTRIES = 500;

interface HistoryEntry {
  command: string;
  cwd: string;
  timestamp: number;
  exitCode: number | null;
}

class ShellHistory {
  private entries: HistoryEntry[] = [];
  private cursor = -1;

  add(command: string, cwd: string, exitCode: number | null = null): void {
    this.entries.unshift({ command, cwd, timestamp: Date.now(), exitCode });
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.pop();
    }
    this.cursor = -1;
  }

  getAll(): HistoryEntry[] {
    return [...this.entries];
  }

  getRecent(limit = 20): HistoryEntry[] {
    return this.entries.slice(0, limit);
  }

  search(query: string): HistoryEntry[] {
    return this.entries.filter((e) =>
      e.command.toLowerCase().includes(query.toLowerCase())
    );
  }

  navigateUp(current: string): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === -1) {
      this.cursor = 0;
    } else {
      this.cursor = Math.min(this.cursor + 1, this.entries.length - 1);
    }
    return this.entries[this.cursor].command;
  }

  navigateDown(): string | null {
    if (this.cursor <= 0) {
      this.cursor = -1;
      return null;
    }
    this.cursor--;
    return this.entries[this.cursor].command;
  }

  resetCursor(): void {
    this.cursor = -1;
  }

  clear(): void {
    this.entries = [];
    this.cursor = -1;
  }

  get size(): number {
    return this.entries.length;
  }
}

export const shellHistory = new ShellHistory();
