import type { Patch, OperationResult } from './types';
import { applyPatches, invertPatches } from './patch';

export interface GroupedHistoryEntry {
  id: string;
  label: string;
  patches: Patch[];
  inverse: Patch[];
  timestamp: number;
  sessionId?: string;
}

export interface GroupedHistoryState {
  entries: GroupedHistoryEntry[];
  currentIndex: number;
}

export class GroupedHistory {
  private entries: GroupedHistoryEntry[] = [];
  private currentIndex = -1;

  push(label: string, patches: Patch[], inverse: Patch[], sessionId?: string): GroupedHistoryEntry {
    const entry: GroupedHistoryEntry = {
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      patches,
      inverse,
      timestamp: Date.now(),
      sessionId,
    };

    this.entries = this.entries.slice(0, this.currentIndex + 1);
    this.entries.push(entry);
    this.currentIndex = this.entries.length - 1;

    return entry;
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.entries.length - 1;
  }

  undo(document: string): { entry: GroupedHistoryEntry; document: string } | null {
    if (!this.canUndo()) return null;
    const entry = this.entries[this.currentIndex];
    this.currentIndex--;
    try {
      const newDocument = applyPatches(document, entry.inverse);
      return { entry, document: newDocument };
    } catch {
      return null;
    }
  }

  redo(document: string): { entry: GroupedHistoryEntry; document: string } | null {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    const entry = this.entries[this.currentIndex];
    try {
      const newDocument = applyPatches(document, entry.patches);
      return { entry, document: newDocument };
    } catch {
      return null;
    }
  }

  peekUndo(): GroupedHistoryEntry | null {
    if (!this.canUndo()) return null;
    return this.entries[this.currentIndex];
  }

  peekRedo(): GroupedHistoryEntry | null {
    if (!this.canRedo()) return null;
    return this.entries[this.currentIndex + 1];
  }

  getEntries(): readonly GroupedHistoryEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.currentIndex = -1;
  }
}
