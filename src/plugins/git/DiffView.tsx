import type { DiffFile, DiffHunk, DiffLine } from './diff-parser';

function DiffLineRow({ line }: { line: DiffLine }) {
  const cls = line.type === 'added' ? 'diff-added'
    : line.type === 'removed' ? 'diff-removed'
    : line.type === 'hunk' ? 'diff-hunk'
    : 'diff-context';

  return (
    <div className={`diff-line ${cls}`}>
      <span className="diff-gutter">{line.content.charAt(0)}</span>
      <span className="diff-text">{line.content.slice(1)}</span>
    </div>
  );
}

function DiffHunkBlock({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="diff-hunk-block">
      <div className="diff-hunk-header">{hunk.header}</div>
      {hunk.lines.map((line, i) => (
        <DiffLineRow key={i} line={line} />
      ))}
    </div>
  );
}

export function DiffFileBlock({ file }: { file: DiffFile }) {
  const label = file.oldPath === file.newPath ? file.newPath : `${file.oldPath} → ${file.newPath}`;

  return (
    <div className="diff-file-block">
      <div className="diff-file-header">{label}</div>
      {file.hunks.map((hunk, i) => (
        <DiffHunkBlock key={i} hunk={hunk} />
      ))}
    </div>
  );
}
