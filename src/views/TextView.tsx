export default function TextView({ state }: { state: Record<string, unknown> }) {
  const content = state.content as string;
  if (!content) return <div className="empty-state">(no content)</div>;
  return <pre className="file-content">{content}</pre>;
}
