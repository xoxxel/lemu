import { EditorState, Transaction, ChangeSet } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { highlightSelectionMatches } from '@codemirror/search';
import { history, undo, redo } from '@codemirror/commands';
import type { Extension } from '@codemirror/state';
import { computeDiff } from '../orchestrator/diff-engine';
import type { DiffResult } from '../orchestrator/diff-engine';
import type { Range, PatchOperation } from './document';
import type { LineState } from './line-metadata';

export interface SearchMatch {
  from: number;
  to: number;
  line: number;
}

export interface SearchSession {
  query: string;
  matches: SearchMatch[];
  matchIndex: number;
  totalMatches: number;
}

export class CMEditorSession {
  readonly originalContent: string;

  private _fullState: EditorState;
  private _changeAccum: ChangeSet;
  private _activeRange: Range | null = null;
  private _rangeView: EditorView | null = null;
  private _rangeState: EditorState | null = null;
  private _onChangeHandler: (() => void) | null = null;
  private _onCommitHandler: ((content: string) => void) | null = null;
  private _onCancelHandler: (() => void) | null = null;
  private _searchQuery: string = '';
  private _searchMatches: SearchMatch[] = [];
  private _searchMatchIndex: number = -1;

  constructor(config: { originalContent: string; initialContent?: string }) {
    this.originalContent = config.originalContent;
    const doc = config.initialContent ?? config.originalContent;
    this._fullState = EditorState.create({
      doc,
      extensions: [EditorState.readOnly.of(true)],
    });
    this._changeAccum = ChangeSet.empty(this._fullState.doc.length);
  }

  get content(): string { return this._fullState.doc.toString(); }
  get lineCount(): number { return this._fullState.doc.lines; }
  get activeRange(): Range | null { return this._activeRange; }

  onChange(handler: () => void): () => void {
    this._onChangeHandler = handler;
    return () => { this._onChangeHandler = null; };
  }

  onCommit(handler: (content: string) => void): void {
    this._onCommitHandler = handler;
  }

  onCancel(handler: () => void): void {
    this._onCancelHandler = handler;
  }

  lineAt(n: number): string {
    const doc = this._fullState.doc;
    if (n < 1 || n > doc.lines) return '';
    return doc.line(n).text;
  }

  getRangeContent(range: Range): string {
    const from = this._lineStart(range.start);
    const to = this._lineEnd(range.end);
    // Use the document's sliceString(from, to) to get the exact substring
    // between byte offsets `from` (inclusive) and `to` (exclusive).
    return this._fullState.doc.sliceString(from, to);
  }

  setActiveRange(range: Range | null): void {
    this._cleanupRangeView();
    this._activeRange = range;
  }

  mountRangeView(parent: HTMLElement): EditorView | null {
    if (!this._activeRange) return null;

    const content = this.getRangeContent(this._activeRange);
    const session = this;

    const themeExt: Extension = EditorView.theme({
      '&': { backgroundColor: 'transparent', height: 'auto' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '20px', overflow: 'hidden' },
      '.cm-content': { padding: '0', caretColor: 'var(--text-primary)' },
      '.cm-line': { padding: '0', minHeight: '20px' },
      '.cm-cursor': { borderLeftColor: 'var(--text-primary) !important' },
      '.cm-selectionBackground': { background: 'rgba(255,255,255,0.08) !important' },
      '.cm-activeLine': { backgroundColor: 'transparent !important' },
      '.cm-gutters': { display: 'none !important' },
      '.cm-foldPlaceholder': { display: 'none !important' },
      '&.cm-focused': { outline: 'none !important' },
      '.cm-selectionMatch': { backgroundColor: 'rgba(255,152,0,0.12) !important' },
    });

    let rangeView: EditorView;
    const keyBindings: { key: string; run: (v: EditorView) => boolean }[] = [
      // Intercept plain Enter to allow trailing-command commits (<< / >>)
      { key: 'Enter', run: (v: EditorView) => {
        const text = v.state.doc.toString();
        if (text.endsWith('<<')) {
          v.dispatch({ changes: { from: text.length - 2, to: text.length, insert: '' } });
          session._onCommitHandler?.(text.slice(0, -2));
          return true;
        }
        if (text.endsWith('>>')) {
          v.dispatch({ changes: { from: text.length - 2, to: text.length, insert: '' } });
          session._onCancelHandler?.();
          return true;
        }
        return false;
      }},
      { key: 'Mod-z', run: undo },
      { key: 'Mod-Shift-z', run: redo },
      { key: 'Mod-y', run: redo },
      { key: 'Escape', run: () => {
        session._onCancelHandler?.();
        return true;
      }},
      { key: 'Mod-Enter', run: () => {
        const c = rangeView.state.doc.toString();
        session._onCommitHandler?.(c);
        return true;
      }},
    ];

    const state = EditorState.create({
      doc: content,
      extensions: [
        history(),
        highlightSelectionMatches(),
        keymap.of(keyBindings),
        EditorView.updateListener.of(update => {
          if (!update.docChanged) return;
          session._checkTrailingCommand(update.view);
          session._onChangeHandler?.();
        }),
        themeExt,
      ],
    });

    rangeView = new EditorView({ state, parent });
    rangeView.focus();
    this._rangeView = rangeView;
    return rangeView;
  }

  getRangeViewContent(): string {
    return this._rangeView?.state.doc.toString() ?? '';
  }

  commitRange(): { operation: PatchOperation } | null {
    if (!this._activeRange || !this._rangeView) return null;

    const newContent = this._rangeView.state.doc.toString();
    const oldContent = this.getRangeContent(this._activeRange);
    if (newContent === oldContent) return null;

    const from = this._lineStart(this._activeRange.start);
    const to = this._lineEnd(this._activeRange.end);

    const tr = this._fullState.update({
      changes: { from, to, insert: newContent },
      annotations: [Transaction.userEvent.of('input')],
    });
    this._fullState = tr.state;
    this._changeAccum = this._changeAccum.compose(tr.changes);

    this._cleanupRangeView();
    const operation: PatchOperation = {
      id: `op-${Date.now()}`,
      range: { ...this._activeRange },
      originalRange: { ...this._activeRange },
      originalLines: oldContent.split('\n'),
      newLines: newContent.split('\n'),
      timestamp: Date.now(),
      source: 'user',
      status: 'applied',
    };
    this._activeRange = null;

    return { operation };
  }

  cancelRange(): void {
    this._cleanupRangeView();
    this._activeRange = null;
  }

  undo(): boolean {
    if (this._rangeView) return undo(this._rangeView);
    return false;
  }

  redo(): boolean {
    if (this._rangeView) return redo(this._rangeView);
    return false;
  }

  reset(): void {
    this._fullState = EditorState.create({
      doc: this.originalContent,
      extensions: [EditorState.readOnly.of(true)],
    });
    this._changeAccum = ChangeSet.empty(this._fullState.doc.length);
    this._cleanupRangeView();
    this._activeRange = null;
    this._searchQuery = '';
    this._searchMatches = [];
    this._searchMatchIndex = -1;
  }

  getDiff(): DiffResult {
    return computeDiff(this.originalContent, this.content);
  }

  /* ── search ── */

  get searchSession(): SearchSession {
    return {
      query: this._searchQuery,
      matches: this._searchMatches,
      matchIndex: this._searchMatchIndex,
      totalMatches: this._searchMatches.length,
    };
  }

  find(query: string): void {
    this._searchQuery = query;
    this._searchMatches = [];
    this._searchMatchIndex = -1;

    if (!query) return;

    const docStr = this._fullState.doc.toString();
    const lowerDoc = docStr.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matches: SearchMatch[] = [];
    let pos = 0;
    while (pos < docStr.length) {
      const idx = lowerDoc.indexOf(lowerQuery, pos);
      if (idx === -1) break;
      const line = this._fullState.doc.lineAt(idx).number;
      matches.push({ from: idx, to: idx + query.length, line });
      pos = idx + query.length;
    }

    this._searchMatches = matches;
    if (matches.length > 0) {
      this._searchMatchIndex = 0;
      this._scrollToMatch(matches[0]);
    }
  }

  clearSearch(): void {
    this._searchQuery = '';
    this._searchMatches = [];
    this._searchMatchIndex = -1;
  }

  nextMatch(): void {
    if (this._searchMatches.length === 0) return;
    this._searchMatchIndex = (this._searchMatchIndex + 1) % this._searchMatches.length;
    this._scrollToMatch(this._searchMatches[this._searchMatchIndex]);
  }

  prevMatch(): void {
    if (this._searchMatches.length === 0) return;
    const n = this._searchMatches.length;
    this._searchMatchIndex = (this._searchMatchIndex - 1 + n) % n;
    this._scrollToMatch(this._searchMatches[this._searchMatchIndex]);
  }

  private _scrollToMatch(match: SearchMatch): void {
    if (this._rangeView && this._activeRange) {
      const rangeStart = this._lineStart(this._activeRange.start);
      const rangeEnd = this._lineEnd(this._activeRange.end);
      if (match.from >= rangeStart && match.to <= rangeEnd) {
        const localFrom = match.from - rangeStart;
        const localTo = match.to - rangeStart;
        this._rangeView.dispatch({
          selection: { anchor: localFrom, head: localTo },
          scrollIntoView: true,
        });
      }
    }
  }

  /* ── line metadata ── */

  getLineMetadata(): LineState[] {
    const doc = this._fullState.doc;
    const currentText = doc.toString();
    const currentLines = currentText.split('\n');
    const origLines = this.originalContent.split('\n');

    const modifiedLines = new Set<number>();
    const insertedLines = new Set<number>();

    this._changeAccum.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const wasEmpty = fromA === toA;
      const startLine = doc.lineAt(fromB).number;
      const endPos = Math.max(toB - 1, fromB);
      const endLine = doc.lineAt(endPos).number;
      const target = wasEmpty ? insertedLines : modifiedLines;
      for (let l = startLine; l <= endLine; l++) target.add(l);
    });

    const searchLines = new Set<number>();
    const lineHighlights = new Map<number, { start: number; end: number }[]>();
    let activeSearchLine = -1;
    if (this._searchQuery && this._searchMatches.length > 0) {
      for (const m of this._searchMatches) {
        searchLines.add(m.line);
        const lineStart = doc.line(m.line).from;
        lineHighlights.set(m.line, [
          ...(lineHighlights.get(m.line) ?? []),
          { start: m.from - lineStart, end: m.to - lineStart },
        ]);
      }
      if (this._searchMatchIndex >= 0 && this._searchMatchIndex < this._searchMatches.length) {
        activeSearchLine = this._searchMatches[this._searchMatchIndex].line;
      }
    }

    const maxLines = Math.max(origLines.length, currentLines.length);
    const result: LineState[] = [];

    for (let n = 1; n <= maxLines; n++) {
      const hasCurrent = n <= currentLines.length;
      const hasOrig = n <= origLines.length;
      const line = hasCurrent ? currentLines[n - 1] : '';

      let isModified = false;
      let isInserted = false;
      let isDeleted = false;

      if (!hasCurrent && hasOrig) {
        isDeleted = true;
      } else if (hasCurrent && !hasOrig) {
        isInserted = insertedLines.has(n) || modifiedLines.has(n);
      } else {
        isModified = modifiedLines.has(n) || insertedLines.has(n);
      }

      result.push({
        lineNumber: n,
        content: line,
        isModified,
        isInserted,
        isDeleted,
        isActiveRange: this._activeRange !== null
          && n >= this._activeRange.start
          && n <= this._activeRange.end,
        isReadonly: this._activeRange === null
          || n < this._activeRange.start
          || n > this._activeRange.end,
        isSearchMatch: searchLines.has(n),
        isActiveSearchMatch: n === activeSearchLine,
        searchHighlights: lineHighlights.get(n),
      });
    }

    return result;
  }

  toState(): Record<string, unknown> {
    return {
      originalContent: this.originalContent,
      currentContent: this.content,
      editHistory: [],
    };
  }

  destroy(): void {
    this._cleanupRangeView();
    this._onChangeHandler = null;
    this._onCommitHandler = null;
    this._onCancelHandler = null;
  }

  /* ── private ── */

  private _cleanupRangeView(): void {
    if (this._rangeView) {
      this._rangeView.destroy();
      this._rangeView = null;
      this._rangeState = null;
    }
  }

  private _lineStart(line: number): number {
    const doc = this._fullState.doc;
    if (line < 1) return 0;
    if (line > doc.lines) return doc.line(doc.lines).to;
    return doc.line(line).from;
  }

  private _lineEnd(line: number): number {
    const doc = this._fullState.doc;
    if (line < 1) return 0;
    if (line > doc.lines) return doc.line(doc.lines).to;
    return doc.line(line).to;
  }

  private _checkTrailingCommand(view: EditorView): void {
    const text = view.state.doc.toString();
    if (text.endsWith('<<')) {
      view.dispatch({
        changes: { from: text.length - 2, to: text.length, insert: '' },
      });
      this._onCommitHandler?.(text.slice(0, -2));
    } else if (text.endsWith('>>')) {
      view.dispatch({
        changes: { from: text.length - 2, to: text.length, insert: '' },
      });
      this._onCancelHandler?.();
    }
  }
}
