import { useState, useEffect, useRef, useCallback } from 'react';
import type { SettingRow, SettingsScope } from '../../core/settings/types';
import { settingsRegistry } from '../../core/settings/registry';

export function SettingsView({ state }: { state: Record<string, unknown> }) {
  const [focusIndex, setFocusIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [filter, setFilter] = useState((state.filter as string) || '');
  const [scope, setScope] = useState<SettingsScope>((state.scope as SettingsScope) || 'system');
  const [settings, setSettings] = useState<SettingRow[]>(() =>
    settingsRegistry.getAll(scope, filter || undefined)
  );
  const [forceUpdate, setForceUpdate] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = settingsRegistry.onAnyChange(() => {
      setSettings(settingsRegistry.getAll(scope, filter || undefined));
    });
    return unsub;
  }, [scope, filter]);

  useEffect(() => {
    setSettings(settingsRegistry.getAll(scope, filter || undefined));
  }, [scope, filter, forceUpdate]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const len = editValue.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  useEffect(() => {
    if (!editing && containerRef.current) {
      containerRef.current.focus();
    }
  }, [editing]);

  const saveEdit = useCallback(() => {
    const row = settings[focusIndex];
    if (!row) return;
    const def = settingsRegistry.getDefinition(row.key);
    let parsed: unknown = editValue;
    if (def?.type === 'number') {
      parsed = Number(editValue);
      if (isNaN(parsed as number)) return;
    }
    if (def?.type === 'boolean') {
      parsed = editValue === 'true' || editValue === '1' || editValue === 'yes';
    }
    settingsRegistry.set(row.key, parsed);
    setEditing(false);
  }, [focusIndex, settings, editValue]);

  const startEditing = useCallback(() => {
    const row = settings[focusIndex];
    if (!row) return;
    setEditValue(String(row.value ?? ''));
    setEditing(true);
  }, [focusIndex, settings]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const moveFocus = useCallback((delta: number) => {
    if (editing) return;
    setFocusIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next >= settings.length) return settings.length - 1;
      return next;
    });
  }, [editing, settings.length]);

  const handleContainerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (editing) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        moveFocus(-1);
        break;
      case 'Enter':
        e.preventDefault();
        startEditing();
        break;
      case 'Home':
        e.preventDefault();
        setFocusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIndex(settings.length - 1);
        break;
    }
  }, [editing, moveFocus, startEditing, settings.length]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      setFocusIndex((prev) => Math.min(prev + 1, settings.length - 1));
    }
  }, [saveEdit, cancelEditing, settings.length]);

  const activeRow = settings[focusIndex];

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      style={{
        height: '100%',
        outline: 'none',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: 1.6,
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <C
        scope={scope}
        count={settings.length}
        filter={filter}
        editing={editing}
      />

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '4px 0',
      }}>
        {settings.map((row, i) => (
          <Row
            key={row.key}
            row={row}
            index={i}
            isFocused={i === focusIndex}
            isEditing={i === focusIndex && editing}
            editValue={i === focusIndex && editing ? editValue : undefined}
            onEditValueChange={setEditValue}
            onInputKeyDown={handleInputKeyDown}
            inputRef={i === focusIndex && editing ? inputRef : undefined}
            onFocus={() => !editing && setFocusIndex(i)}
            onActivate={() => {
              setFocusIndex(i);
              setEditValue(String(row.value ?? ''));
              setEditing(true);
            }}
          />
        ))}

        {settings.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            {filter ? `No settings matching "${filter}"` : 'No settings registered'}
          </div>
        )}
      </div>

      <Footer
        focusIndex={focusIndex}
        total={settings.length}
        activeRow={activeRow}
        editing={editing}
      />
    </div>
  );
}

function C({ scope, count, filter, editing }: {
  scope: SettingsScope; count: number; filter: string; editing: boolean;
}) {
  return (
    <div style={{
      padding: '6px 16px',
      borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg-secondary)',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexShrink: 0,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{ color: 'var(--accent)' }}>[scope: {scope}]</span>
      <span>{count} settings</span>
      {filter && <span style={{ color: 'var(--accent)' }}>filter &quot;{filter}&quot;</span>}
      <span style={{ marginLeft: 'auto', color: editing ? 'var(--accent)' : 'var(--text-muted)' }}>
        {editing ? '-- INSERT --' : '-- NORMAL --'}
      </span>
    </div>
  );
}

function Row({ row, index, isFocused, isEditing, editValue, onEditValueChange, onInputKeyDown, inputRef, onFocus, onActivate }: {
  row: SettingRow;
  index: number;
  isFocused: boolean;
  isEditing: boolean;
  editValue?: string;
  onEditValueChange: (v: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  onFocus: () => void;
  onActivate: () => void;
}) {
  const sourceColor = row.source === 'session' ? '#00c853'
    : row.source === 'user' ? '#ffa726'
    : 'var(--text-muted)';

  return (
    <div
      onClick={onFocus}
      onDoubleClick={onActivate}
      style={{
        display: 'flex',
        padding: '0 16px',
        height: 22,
        alignItems: 'center',
        background: isFocused
          ? isEditing
            ? 'var(--accent)'
            : 'rgba(255,255,255,0.04)'
          : 'transparent',
        color: isEditing ? '#fff' : 'var(--text-primary)',
        cursor: 'default',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: '22px',
        whiteSpace: 'pre',
      }}
    >
      {/* Line number: fixed 4-char width */}
      <span style={{
        display: 'inline-block',
        width: '3ch',
        textAlign: 'right',
        marginRight: '1ch',
        color: isFocused && !isEditing ? 'var(--accent)' : 'var(--text-muted)',
        userSelect: 'none',
      }}>
        {index + 1}
      </span>

      {/* Key: fixed 34-char width */}
      <span style={{
        display: 'inline-block',
        width: '34ch',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isEditing ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
      }}>
        {row.key}
      </span>

      {/* Separator */}
      <span style={{
        display: 'inline-block',
        width: '3ch',
        textAlign: 'center',
        color: isEditing ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
      }}>
        =
      </span>

      {/* Value */}
      <span style={{
        display: 'inline-block',
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isEditing ? '#fff'
          : row.source === 'session' ? '#00c853'
          : row.source === 'user' ? '#ffa726'
          : 'var(--text-primary)',
        opacity: row.source === 'default' && !isEditing ? 0.75 : 1,
      }}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue ?? ''}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            onBlur={() => {
              /* let Esc/Enter handle commit */
            }}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: '18px',
              padding: '0 4px',
              margin: 0,
              caretColor: '#fff',
              display: 'block',
              boxSizing: 'border-box',
            }}
            spellCheck={false}
          />
        ) : (
          <span>{formatValue(row.value)}</span>
        )}
      </span>

      {/* Source badge */}
      <span style={{
        display: 'inline-block',
        width: '7ch',
        textAlign: 'right',
        fontSize: 10,
        color: sourceColor,
        userSelect: 'none',
        opacity: row.source === 'default' ? 0.5 : 1,
        marginLeft: '1ch',
      }}>
        {row.source}
      </span>
    </div>
  );
}

function Footer({ focusIndex, total, activeRow, editing }: {
  focusIndex: number; total: number; activeRow: SettingRow | undefined; editing: boolean;
}) {
  return (
    <div style={{
      padding: '4px 16px',
      borderTop: '0.5px solid var(--border)',
      background: 'var(--bg-secondary)',
      fontSize: 11,
      color: 'var(--text-muted)',
      flexShrink: 0,
      fontFamily: 'var(--font-mono)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      whiteSpace: 'nowrap',
    }}>
      <span>Ln {focusIndex + 1}/{total}</span>
      {activeRow && (
        <>
          <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeRow.key}
          </span>
          {activeRow.definition?.description && (
            <span style={{ opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeRow.definition.description}
            </span>
          )}
        </>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '(unset)';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && !value) return '(empty)';
  return String(value);
}
