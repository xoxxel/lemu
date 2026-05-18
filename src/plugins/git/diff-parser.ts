export interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk';
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
}

export interface DiffData {
  files: DiffFile[];
}

export function parseDiff(stdout: string): DiffData | null {
  const lines = stdout.split('\n');
  const files: DiffFile[] = [];
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;

  for (const raw of lines) {
    if (raw.startsWith('diff --git ')) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile) {
        files.push(currentFile);
      }
      const parts = raw.split(' ');
      currentFile = {
        oldPath: parts[2]?.replace(/^a\//, '') || '',
        newPath: parts[3]?.replace(/^b\//, '') || '',
        hunks: [],
      };
      currentHunk = null;
      continue;
    }

    if (raw.startsWith('@@')) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      currentHunk = { header: raw, lines: [] };
      continue;
    }

    if (raw.startsWith('--- ') || raw.startsWith('+++ ') || raw.startsWith('index ')) {
      continue;
    }

    if (currentHunk) {
      if (raw.startsWith('+')) {
        currentHunk.lines.push({ type: 'added', content: raw });
      } else if (raw.startsWith('-')) {
        currentHunk.lines.push({ type: 'removed', content: raw });
      } else {
        currentHunk.lines.push({ type: 'context', content: raw });
      }
    }
  }

  if (currentFile && currentHunk) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile) {
    files.push(currentFile);
  }

  return files.length > 0 ? { files } : null;
}
