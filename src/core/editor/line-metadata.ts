import { Document } from './document';
import type { PatchOperation } from './document';
import type { Range } from './document';

export interface LineState {
  lineNumber: number;
  content: string;
  isModified: boolean;
  isInserted: boolean;
  isDeleted: boolean;
  isActiveRange: boolean;
  isReadonly: boolean;
  isSearchMatch: boolean;
  isActiveSearchMatch: boolean;
  /** Column ranges within this line for text-level search highlighting */
  searchHighlights?: { start: number; end: number }[];
}

/**
 * Compute per-line metadata by comparing the current document against
 * its original and checking each line against applied operations.
 */
export function computeLineMetadata(
  current: Document,
  originalContent: string,
  activeRange: Range | null,
): LineState[] {
  const original = new Document(originalContent);
  const maxLines = Math.max(current.lineCount, original.lineCount);
  const result: LineState[] = [];

  for (let n = 1; n <= maxLines; n++) {
    const curLine = n <= current.lineCount ? current.lineAt(n) : undefined;
    const origLine = n <= original.lineCount ? original.lineAt(n) : undefined;

    let isInserted = curLine !== undefined && origLine === undefined;
    let isDeleted = curLine === undefined && origLine !== undefined;
    let isModified = !isInserted && !isDeleted && curLine !== origLine;

    // Lines beyond current document that exist in original are "deleted" from view
    if (curLine === undefined && origLine !== undefined) {
      isDeleted = true;
      isModified = false;
      isInserted = false;
    }

    const inActiveRange = activeRange
      ? n >= activeRange.start && n <= activeRange.end
      : false;

    result.push({
      lineNumber: n,
      content: curLine ?? '',
      isModified,
      isInserted,
      isDeleted,
      isActiveRange: inActiveRange,
      isReadonly: !inActiveRange,
      isSearchMatch: false,
      isActiveSearchMatch: false,
    });
  }

  return result;
}

/** Check if a range has any actual modifications against the original. */
export function rangeHasModifications(
  current: Document,
  originalContent: string,
  range: Range,
): boolean {
  const origDoc = new Document(originalContent);
  for (let n = range.start; n <= range.end && n <= current.lineCount; n++) {
    const cur = current.lineAt(n);
    const orig = origDoc.lineAt(n);
    if (cur !== orig) return true;
  }
  return false;
}
