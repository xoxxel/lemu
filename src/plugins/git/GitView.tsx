import { parseDiff, type DiffData } from './diff-parser';
import { DiffFileBlock } from './DiffView';

interface GitData {
  command: string;
  stdout: string;
  stderr: string;
}

function isDiffOutput(stdout: string): boolean {
  return stdout.startsWith('diff --git') || stdout.includes('\ndiff --git');
}

function PlainOutput({ data }: { data: GitData }) {
  return (
    <>
      {data.stdout && (
        <pre style={{
          margin: 0,
          padding: 12,
          borderRadius: 6,
          background: 'var(--color-background-secondary)',
          border: '0.5px solid var(--color-border-tertiary)',
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-primary)',
        }}>{data.stdout}</pre>
      )}
      {data.stderr && (
        <pre style={{
          margin: '8px 0 0',
          padding: 12,
          borderRadius: 6,
          background: 'var(--color-background-error)',
          border: '0.5px solid var(--color-border-error)',
          whiteSpace: 'pre-wrap',
          color: 'var(--color-text-error)',
        }}>{data.stderr}</pre>
      )}
    </>
  );
}

function DiffOutput({ diff }: { diff: DiffData }) {
  return (
    <div className="diff-view">
      {diff.files.map((file, i) => (
        <DiffFileBlock key={i} file={file} />
      ))}
    </div>
  );
}

export function GitView({ state }: { state: Record<string, unknown> }) {
  const data = state as unknown as GitData;

  const diff = data.stdout ? parseDiff(data.stdout) : null;

  return (
    <div className="git-view">
      {data.command && (
        <div className="git-command-line">
          <span className="git-prompt">$</span>
          <span> git {data.command}</span>
        </div>
      )}
      {diff ? <DiffOutput diff={diff} /> : <PlainOutput data={data} />}
    </div>
  );
}
