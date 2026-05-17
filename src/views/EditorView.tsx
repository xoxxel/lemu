export default function EditorView({ state }: { state: Record<string, unknown> }) {
  const content = state.content as string;
  const path = state.path as string;
  return (
    <>
      <div className="editor-tab-header">{path || 'Untitled'}</div>
      <pre className="file-content">{content}</pre>
    </>
  );
}
