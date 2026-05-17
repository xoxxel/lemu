export default function BrowserView({ state }: { state: Record<string, unknown> }) {
  const content = state.content as string;
  const path = state.path as string;
  return (
    <div className="browser-preview">
      <div className="browser-preview-bar">{path || 'Preview'}</div>
      <iframe
        className="browser-preview-frame"
        srcDoc={content}
        title="browser preview"
        sandbox="allow-scripts"
      />
    </div>
  );
}
