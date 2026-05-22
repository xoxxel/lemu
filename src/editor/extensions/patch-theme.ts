import { EditorView } from '@codemirror/view';

export const patchTheme = EditorView.baseTheme({
  '.cm-patch-deleted': {
    backgroundColor: 'rgba(255, 80, 80, 0.10)',
    textDecoration: 'line-through',
    opacity: 0.6,
    padding: '1px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  '.cm-patch-inserted': {
    backgroundColor: 'rgba(80, 200, 80, 0.10)',
    padding: '1px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  '.cm-patch-actions': {
    display: 'inline-flex',
    gap: '8px',
    marginLeft: '4px',
    fontSize: '0.75em',
    opacity: 0.7,
    alignItems: 'center',
  },
  '.cm-patch-accept': {
    color: '#4caf50',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 600,
  },
  '.cm-patch-accept:hover': {
    textDecoration: 'underline',
    opacity: 1,
  },
  '.cm-patch-reject': {
    color: '#f44336',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 600,
  },
  '.cm-patch-reject:hover': {
    textDecoration: 'underline',
    opacity: 1,
  },
  '.cm-patch-block': {
    padding: '1px 0',
  },
  '.cm-patch-gutter-accepted': {
    backgroundColor: 'rgba(80, 200, 80, 0.25)',
  },
  '.cm-patch-focused': {
    outline: '1px solid rgba(100, 160, 255, 0.4)',
    outlineOffset: '-1px',
  },
});
