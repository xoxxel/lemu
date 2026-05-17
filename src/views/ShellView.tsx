export default function ShellView({ state }: { state: Record<string, unknown> }) {
  const stdout = state.stdout as string;
  const stderr = state.stderr as string;
  const command = state.command as string;
  const output = [stdout, stderr].filter(Boolean).join('\n');
  if (!output) return <div className="empty-state">(no output)</div>;
  return (
    <div className="shell-output">
      {command && <div className="shell-output-header">{'> '}{command}</div>}
      <pre className="file-content">{output}</pre>
    </div>
  );
}
