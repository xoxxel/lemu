export { CMEditorSession } from './cm-editor-session';

import { Document, type Range, type Patch, type PatchOperation } from './document';
import { PatchLog } from './patch-log';
import { computeLineMetadata, type LineState } from './line-metadata';
import { computeDiff, type DiffResult } from '../orchestrator/diff-engine';

export interface EditorSessionConfig {
  originalContent: string;
  initialContent?: string;
}

/** @deprecated Use CMEditorSession instead */
export class EditorSession {
  readonly originalContent: string;
  private _document: Document;
  private _patchLog: PatchLog;
  private _activeRange: Range | null = null;

  constructor(config: EditorSessionConfig) {
    this.originalContent = config.originalContent;
    this._document = new Document(config.initialContent ?? config.originalContent);
    this._patchLog = new PatchLog();
  }

  get document(): Document { return this._document; }
  get patchLog(): PatchLog { return this._patchLog; }
  get activeRange(): Range | null { return this._activeRange; }

  setActiveRange(range: Range | null): void {
    this._activeRange = range;
  }

  /** Apply an edit patch. Returns the created operation. */
  applyEdit(patch: Patch): PatchOperation {
    const { document, operation } = this._document.applyPatch(patch);
    this._document = document;
    this._patchLog.push(operation);
    return operation;
  }

  /** Revert an operation by ID. Returns a reverse patch or undefined. */
  revertEdit(opId: string): PatchOperation | undefined {
    const op = this._patchLog.revert(opId);
    if (!op) return undefined;
    // Rebuild document from scratch excluding the reverted operation
    this._document = this._patchLog.buildDocument(this.originalContent);
    return op;
  }

  /** Reset document to original content and clear history. */
  reset(): void {
    this._document = new Document(this.originalContent);
    this._patchLog.clear();
    this._activeRange = null;
  }

  /** Get current diff against original. */
  getDiff(): DiffResult {
    return computeDiff(this.originalContent, this._document.content);
  }

  /** Get per-line metadata for the current state. */
  getLineMetadata(): LineState[] {
    return computeLineMetadata(this._document, this.originalContent, this._activeRange);
  }

  /** Serialize the current session to a plain object for tab state. */
  toState(): Record<string, unknown> {
    return {
      originalContent: this.originalContent,
      currentContent: this._document.content,
      editHistory: this._patchLog.all.map(op => ({
        id: op.id,
        range: op.originalRange,
        originalLines: op.originalLines,
        newLines: op.newLines,
        timestamp: op.timestamp,
        source: op.source,
        status: op.status,
      })),
    };
  }
}
