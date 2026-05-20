export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  origLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  origStart: number;
  origCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffResult {
  lines: DiffLine[];
  hunks: DiffHunk[];
}

export function computeDiff(original: string, proposed: string): DiffResult {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const m = origLines.length;
  const n = propLines.length;

  // Build LCS dp table for orig[i..] and prop[j..]
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (origLines[i] === propLines[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  const hunks: DiffHunk[] = [];

  let i = 0, j = 0;
  let currentHunk: DiffLine[] | null = null;
  let hunkOrigStart = 0;
  let hunkNewStart = 0;
  let origLineNum = 1;
  let newLineNum = 1;

  while (i < m || j < n) {
    if (i < m && j < n && origLines[i] === propLines[j]) {
      // unchanged line
      const line: DiffLine = { type: 'unchanged', content: origLines[i], origLineNumber: origLineNum, newLineNumber: newLineNum };
      lines.push(line);
      if (currentHunk) {
        // finalize hunk: compute counts
        const origCount = currentHunk.filter(l => l.type !== 'added').length;
        const newCount = currentHunk.filter(l => l.type !== 'removed').length;
        hunks.push({ origStart: hunkOrigStart, origCount, newStart: hunkNewStart, newCount, lines: currentHunk });
        currentHunk = null;
      }
      i++; j++; origLineNum++; newLineNum++;
    } else if (j < n && (i === m || dp[i][j + 1] >= dp[i + 1][j])) {
      // added in proposed (present in new but not in orig)
      const line: DiffLine = { type: 'added', content: propLines[j], newLineNumber: newLineNum };
      lines.push(line);
      if (!currentHunk) {
        currentHunk = [];
        hunkOrigStart = origLineNum;
        hunkNewStart = newLineNum;
      }
      currentHunk.push(line);
      j++; newLineNum++;
    } else if (i < m) {
      // removed from original
      const line: DiffLine = { type: 'removed', content: origLines[i], origLineNumber: origLineNum };
      lines.push(line);
      if (!currentHunk) {
        currentHunk = [];
        hunkOrigStart = origLineNum;
        hunkNewStart = newLineNum;
      }
      currentHunk.push(line);
      i++; origLineNum++;
    } else {
      break;
    }
  }

  if (currentHunk) {
    const origCount = currentHunk.filter(l => l.type !== 'added').length;
    const newCount = currentHunk.filter(l => l.type !== 'removed').length;
    hunks.push({ origStart: hunkOrigStart, origCount, newStart: hunkNewStart, newCount, lines: currentHunk });
  }

  return { lines, hunks };
}

export function formatDiff(diff: DiffResult): string {
  const sb: string[] = [];
  for (const hunk of diff.hunks) {
    sb.push(`@@ -${hunk.origStart},${hunk.origCount} +${hunk.newStart},${hunk.newCount} @@`);
    for (const line of hunk.lines) {
      sb.push(`${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} ${line.content}`);
    }
  }
  return sb.join('\n');
}
