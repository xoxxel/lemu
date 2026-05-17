export default function AgentView({ state }: { state: Record<string, unknown> }) {
  const content = state.content as string;
  const logs = state.logs as string[] | undefined;
  return (
    <div className="agent-response">
      {content && <div className="agent-response-body">{content}</div>}
      {logs && logs.length > 0 && (
        <div className="agent-logs">
          <div className="agent-logs-header">Agent Steps ({logs.length})</div>
          {logs.map((log, i) => (
            <div key={i} className="agent-log-line">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
