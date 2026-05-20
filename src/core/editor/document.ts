export interface Range {
  start: number;
  end: number;
}

export class Document {
  private _content: string;
  private _lines: string[];

  constructor(content: string) {
    this._content = content;
    this._lines = content.split('\n');
  }

  get content(): string { return this._content; }
  get lines(): readonly string[] { return this._lines; }
  get lineCount(): number { return this._lines.length; }

  lineAt(n: number): string {
    return this._lines[n - 1] ?? '';
  }

  getRange(range: Range): string {
    return this._lines.slice(range.start - 1, range.end).join('\n');
  }

  /** Apply a patch and return a NEW Document (immutable). The patch is returned separately for logging. */
  applyPatch(patch: Patch): { document: Document; operation: PatchOperation } {
    const oldLines = this._lines.slice(patch.range.start - 1, patch.range.end);
    const newLines = patch.newContent ? patch.newContent.split('\n') : [];
    const replaced = [
      ...this._lines.slice(0, patch.range.start - 1),
      ...newLines,
      ...this._lines.slice(patch.range.end),
    ];
    const operation: PatchOperation = {
      id: patch.id ?? nextOpId(),
      range: { start: patch.range.start, end: patch.range.start + newLines.length - 1 },
      originalRange: { ...patch.range },
      originalLines: oldLines,
      newLines,
      timestamp: Date.now(),
      source: patch.source ?? 'user',
      status: 'applied',
    };
    return { document: new Document(replaced.join('\n')), operation };
  }
}

let _opCounter = 0;
function nextOpId(): string {
  return `op-${Date.now()}-${++_opCounter}`;
}

export interface Patch {
  id?: string;
  range: Range;
  newContent: string;
  source?: 'user' | 'ai' | 'system';
}

export interface PatchOperation {
  id: string;
  range: Range;
  originalRange: Range;
  originalLines: string[];
  newLines: string[];
  timestamp: number;
  source: 'user' | 'ai' | 'system';
  status: 'pending' | 'applied' | 'reverted';
}
