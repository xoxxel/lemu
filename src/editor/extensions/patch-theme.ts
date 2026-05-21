import { EditorView } from '@codemirror/view';

export const patchTheme = EditorView.baseTheme({
  '.cm-patch-deleted': {
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    textDecoration: 'line-through',
    opacity: 0.65,
    padding: '1px 4px',
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  '.cm-patch-inserted': {
    backgroundColor: 'rgba(80, 200, 80, 0.12)',
    padding: '1px 4px',
    whiteSpace: 'pre-wrap',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  '.cm-patch-actions': {
    display: 'inline-flex',
    gap: '10px',
    marginLeft: '8px',
    fontSize: '0.8em',
    opacity: 0.85,
    alignItems: 'center',
  },
  '.cm-patch-accept': {
    color: '#4caf50',
    cursor: 'pointer',
    userSelect: 'none',
  },
  '.cm-patch-accept:hover': {
    textDecoration: 'underline',
  },
  '.cm-patch-reject': {
    color: '#f44336',
    cursor: 'pointer',
    userSelect: 'none',
  },
  '.cm-patch-reject:hover': {
    textDecoration: 'underline',
  },
  '.cm-patch-block': {
    padding: '2px 0',
  },
  '.cm-patch-focused': {
    outline: '1px solid rgba(100, 160, 255, 0.5)',
  },
});
