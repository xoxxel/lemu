export interface EditSuggestion {
  id: string;
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  reason?: string;
}

let counter = 0;

class SuggestionStore {
  private suggestions = new Map<string, EditSuggestion>();

  add(suggestion: Omit<EditSuggestion, 'id' | 'timestamp' | 'status'>): EditSuggestion {
    const id = `sug-${Date.now()}-${++counter}`;
    const entry: EditSuggestion = {
      ...suggestion,
      id,
      status: 'pending',
      timestamp: Date.now(),
    };
    this.suggestions.set(id, entry);
    return entry;
  }

  get(id: string): EditSuggestion | undefined {
    return this.suggestions.get(id);
  }

  approve(id: string): EditSuggestion | undefined {
    const sug = this.suggestions.get(id);
    if (sug) sug.status = 'approved';
    return sug;
  }

  reject(id: string, reason?: string): EditSuggestion | undefined {
    const sug = this.suggestions.get(id);
    if (sug) {
      sug.status = 'rejected';
      sug.reason = reason;
    }
    return sug;
  }

  getPending(): EditSuggestion[] {
    return Array.from(this.suggestions.values()).filter(s => s.status === 'pending');
  }

  getAll(): EditSuggestion[] {
    return Array.from(this.suggestions.values());
  }

  clear(): void {
    this.suggestions.clear();
  }
}

export const suggestionStore = new SuggestionStore();
