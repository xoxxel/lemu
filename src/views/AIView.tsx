export default function AIView({ state }: { state: Record<string, unknown> }) {
  const content = state.content as string;
  if (!content) return <div className="empty-state">(no response)</div>;
  return (
    <div className="ai-response">
      <div className="ai-response-header">AI Response</div>
      <div className="ai-response-body">{content}</div>
    </div>
  );
}
