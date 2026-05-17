export type HistoryEntryType = 'slash-command' | 'shell-command';

export interface HistoryEntry {
  id: string;
  command: string;
  timestamp: number;
  type: HistoryEntryType;
}

const MAX_ENTRIES = 200;

export class CommandHistory {
  private entries: HistoryEntry[] = [];
  private cursor = -1;
  private savedInput = '';

  add(command: string, type: HistoryEntryType): void {
    if (!command.trim()) return;
    if (this.entries.length > 0 && this.entries[0].command === command) return;
    this.entries.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      command,
      timestamp: Date.now(),
      type,
    });
    if (this.entries.length > MAX_ENTRIES) this.entries.pop();
    this.cursor = -1;
    this.savedInput = '';
  }

  navigateUp(currentInput: string): string | null {
    if (this.entries.length === 0) return null;
    if (this.cursor === -1) {
      this.savedInput = currentInput;
      this.cursor = 0;
    } else {
      this.cursor = Math.min(this.cursor + 1, this.entries.length - 1);
    }
    return this.entries[this.cursor].command;
  }

  navigateDown(): string | null {
    if (this.cursor <= 0) {
      this.cursor = -1;
      return this.savedInput || null;
    }
    this.cursor--;
    return this.entries[this.cursor]?.command ?? (this.savedInput || null);
  }

  reset(): void {
    this.cursor = -1;
    this.savedInput = '';
  }

  getCursor(): number {
    return this.cursor;
  }

  isNavigating(): boolean {
    return this.cursor !== -1;
  }

  getAll(): HistoryEntry[] {
    return [...this.entries];
  }

  getRecent(limit = 20): HistoryEntry[] {
    return this.entries.slice(0, limit);
  }

  getByType(type: HistoryEntryType): HistoryEntry[] {
    return this.entries.filter((e) => e.type === type);
  }
}

export const commandHistory = new CommandHistory();
