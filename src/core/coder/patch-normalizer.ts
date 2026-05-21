import type { Patch } from '../operations/types';

export interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export class PatchNormalizer {
  static fromFullFile(original: string, proposed: string): Patch[] {
    if (original === proposed) return [];

    const diff = this.computeSimpleDiff(original, proposed);
    if (diff.length === 0) return [];

    const origOffsets = this.lineOffsets(original);
    const patches: Patch[] = [];

    for (const hunk of diff) {
      const { origStart, origCount, newStart, newCount } = hunk;

      if (origCount === 0 && newCount > 0) {
        const pos = this.lineToOffset(proposed, newStart, newCount);
        patches.push({
          range: { start: pos, end: pos },
          oldText: '',
          newText: proposed.slice(pos, this.lineToEndOffset(proposed, newStart, newCount)),
        });
        continue;
      }

      if (origCount > 0 && newCount === 0) {
        const start = origOffsets[origStart - 1];
        const end = origOffsets[origStart - 1 + origCount];
        patches.push({
          range: { start, end },
          oldText: original.slice(start, end),
          newText: '',
        });
        continue;
      }

      const start = origOffsets[origStart - 1];
      const end = origOffsets[origStart - 1 + origCount];
      const newStartOffset = this.lineToOffset(proposed, newStart, newCount);
      const newEndOffset = this.lineToEndOffset(proposed, newStart, newCount);

      patches.push({
        range: { start, end },
        oldText: original.slice(start, end),
        newText: proposed.slice(newStartOffset, newEndOffset),
      });
    }

    return patches;
  }

  static fromUnifiedDiff(diffText: string, currentContent: string): Patch[] {
    const hunks = this.parseUnifiedDiff(diffText);
    if (hunks.length === 0) return [];

    const offsets = this.lineOffsets(currentContent);
    const lines = currentContent.split('\n');
    const patches: Patch[] = [];

    for (const hunk of hunks) {
      const { origStart, origCount, lines: hunkLines } = hunk;

      const oldLines: string[] = [];
      const newLines: string[] = [];

      for (const line of hunkLines) {
        if (line.startsWith('-')) oldLines.push(line.slice(1));
        else if (line.startsWith('+')) newLines.push(line.slice(1));
        else {
          oldLines.push(line.slice(1));
          newLines.push(line.slice(1));
        }
      }

      if (origCount === 0) {
        const pos = offsets[origStart - 1] ?? currentContent.length;
        patches.push({
          range: { start: pos, end: pos },
          oldText: '',
          newText: newLines.join('\n'),
        });
        continue;
      }

      if (newLines.length === 0) {
        const start = offsets[origStart - 1];
        const end = offsets[origStart - 1 + origCount];
        patches.push({
          range: { start, end },
          oldText: currentContent.slice(start, end),
          newText: '',
        });
        continue;
      }

      const start = offsets[origStart - 1];
      const end = offsets[origStart - 1 + origCount];
      patches.push({
        range: { start, end },
        oldText: currentContent.slice(start, end),
        newText: newLines.join('\n'),
      });
    }

    return patches;
  }

  static fromSearchReplace(blocks: SearchReplaceBlock[], currentContent: string): Patch[] {
    const patches: Patch[] = [];
    let offset = 0;

    for (const block of blocks) {
      const idx = currentContent.indexOf(block.search, offset);
      if (idx === -1) continue;

      patches.push({
        range: { start: idx, end: idx + block.search.length },
        oldText: block.search,
        newText: block.replace,
      });

      offset = idx + block.replace.length;
    }

    return patches;
  }

  static computePatches(original: string, modified: string): Patch[] {
    return this.fromFullFile(original, modified);
  }

  private static lineOffsets(text: string): number[] {
    const offsets: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') offsets.push(i + 1);
    }
    offsets.push(text.length);
    return offsets;
  }

  private static lineToOffset(text: string, startLine: number, lineCount: number): number {
    const offsets = this.lineOffsets(text);
    return offsets[Math.min(startLine - 1, offsets.length - 1)];
  }

  private static lineToEndOffset(text: string, startLine: number, lineCount: number): number {
    const offsets = this.lineOffsets(text);
    const end = startLine - 1 + lineCount;
    return offsets[Math.min(end, offsets.length - 1)];
  }

  private static computeSimpleDiff(original: string, proposed: string): SimpleHunk[] {
    const origLines = original.split('\n');
    const propLines = proposed.split('\n');
    const m = origLines.length;
    const n = propLines.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (origLines[i] === propLines[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const hunks: SimpleHunk[] = [];
    let i = 0, j = 0;
    let origLineNum = 1, newLineNum = 1;

    while (i < m || j < n) {
      if (i < m && j < n && origLines[i] === propLines[j]) {
        i++; j++; origLineNum++; newLineNum++;
        continue;
      }

      const hunkOrigStart = origLineNum;
      const hunkNewStart = newLineNum;
      let origCount = 0;
      let newCount = 0;

      while (i < m && j < n && origLines[i] !== propLines[j]) {
        const takeOrig = j === n || (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1]));
        if (takeOrig) { i++; origLineNum++; origCount++; }
        else { j++; newLineNum++; newCount++; }
      }
      while (i < m && (j === n || dp[i + 1][j] >= dp[i][j + 1])) {
        i++; origLineNum++; origCount++;
      }
      while (j < n && (i === m || dp[i][j + 1] > dp[i + 1][j])) {
        j++; newLineNum++; newCount++;
      }

      if (origCount > 0 || newCount > 0) {
        hunks.push({ origStart: hunkOrigStart, origCount, newStart: hunkNewStart, newCount });
      }
    }

    return hunks;
  }

  private static parseUnifiedDiff(diffText: string): UnifiedHunk[] {
    const lines = diffText.split('\n');
    const hunks: UnifiedHunk[] = [];
    let current: UnifiedHunk | null = null;

    for (const line of lines) {
      const headerMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
      if (headerMatch) {
        if (current) hunks.push(current);
        current = {
          origStart: parseInt(headerMatch[1], 10),
          origCount: headerMatch[2] ? parseInt(headerMatch[2], 10) : 1,
          newStart: parseInt(headerMatch[3], 10),
          newCount: headerMatch[4] ? parseInt(headerMatch[4], 10) : 1,
          lines: [],
        };
      } else if (current && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
        current.lines.push(line);
      }
    }
    if (current) hunks.push(current);

    return hunks;
  }
}

interface SimpleHunk {
  origStart: number;
  origCount: number;
  newStart: number;
  newCount: number;
}

interface UnifiedHunk {
  origStart: number;
  origCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}
