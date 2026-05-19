export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  content: string;
}

export interface DiffResult {
  lines: DiffLine[];
  hunks: Array<{ start: number; end: number; lines: DiffLine[] }>;
}

export function computeDiff(original: string, proposed: string): DiffResult {
  const origLines = original.split('\n');
  const propLines = proposed.split('\n');
  const lines: DiffLine[] = [];
  const hunks: DiffResult['hunks'] = [];

  const maxLen = Math.max(origLines.length, propLines.length);
  let currentHunk: DiffLine[] | null = null;

  for (let i = 0; i < maxLen; i++) {
    if (origLines[i] === propLines[i]) {
      const line: DiffLine = { type: 'unchanged', lineNumber: i + 1, content: origLines[i] ?? '' };
      lines.push(line);
      if (currentHunk) {
        hunks.push({ start: currentHunk[0].lineNumber, end: line.lineNumber, lines: currentHunk });
        currentHunk = null;
      }
    } else {
      if (origLines[i] !== undefined) {
        lines.push({ type: 'removed', lineNumber: i + 1, content: origLines[i] });
      }
      if (propLines[i] !== undefined) {
        lines.push({ type: 'added', lineNumber: i + 1, content: propLines[i] });
      }
      if (!currentHunk) currentHunk = [];
      currentHunk.push({ type: origLines[i] !== undefined ? 'removed' : 'added', lineNumber: i + 1, content: propLines[i] ?? origLines[i] ?? '' });
    }
  }

  if (currentHunk) {
    hunks.push({ start: currentHunk[0].lineNumber, end: currentHunk[currentHunk.length - 1].lineNumber, lines: currentHunk });
  }

  return { lines, hunks };
}

export function formatDiff(diff: DiffResult): string {
  const sb: string[] = [];
  for (const hunk of diff.hunks) {
    sb.push(`@@ -${hunk.start},${hunk.end} @@`);
    for (const line of hunk.lines) {
      sb.push(`${line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '} ${line.content}`);
    }
  }
  return sb.join('\n');
}
