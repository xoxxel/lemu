import { useState } from 'react';

interface GenericJsonViewerProps {
  data: Record<string, unknown>;
}

function JsonNode({ value, depth }: { value: unknown; depth: number }): JSX.Element {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (value === null) return <span style={{ color: 'var(--color-text-tertiary)' }}>null</span>;
  if (value === undefined) return <span style={{ color: 'var(--color-text-tertiary)' }}>undefined</span>;

  if (typeof value === 'string') {
    return <span style={{ color: '#185FA5' }}>"{value}"</span>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span style={{ color: '#0F6E56' }}>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span style={{ color: 'var(--color-text-tertiary)' }}>[]</span>;
    return (
      <span>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--color-text-secondary)' }}
        >
          {collapsed ? '\u25B6' : '\u25BC'} [{value.length}]
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid var(--color-border-tertiary)', marginLeft: 4 }}>
            {value.map((item, i) => (
              <div key={i}>
                <JsonNode value={item} depth={depth + 1} />
                {i < value.length - 1 && ','}
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span style={{ color: 'var(--color-text-tertiary)' }}>{'{}'}</span>;
    return (
      <span>
        <span
          onClick={() => setCollapsed(!collapsed)}
          style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--color-text-secondary)' }}
        >
          {collapsed ? '\u25B6' : '\u25BC'} {'{}'}
        </span>
        {!collapsed && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid var(--color-border-tertiary)', marginLeft: 4 }}>
            {entries.map(([key, val]) => (
              <div key={key} style={{ marginBottom: 2 }}>
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{key}</span>
                <span style={{ color: 'var(--color-text-tertiary)', margin: '0 4px' }}>:</span>
                <JsonNode value={val} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

export function GenericJsonViewer({ data }: GenericJsonViewerProps) {
  return (
    <div style={{
      padding: 24,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: 1.6,
      color: 'var(--color-text-primary)',
    }}>
      <JsonNode value={data} depth={0} />
    </div>
  );
}
