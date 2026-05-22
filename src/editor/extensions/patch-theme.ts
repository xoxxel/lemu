import { EditorView } from '@codemirror/view';

export const patchTheme = EditorView.baseTheme({
  '.cm-patch-deleted': {
    backgroundColor: 'var(--lemu-dim-red)',
    color: 'var(--lemu-red)',
    textDecoration: 'line-through',
    padding: '1px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '20px',
  },
  '.cm-patch-inserted': {
    backgroundColor: 'var(--lemu-dim-green)',
    color: 'var(--lemu-green)',
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
    color: 'var(--lemu-text-dim)',
    alignItems: 'center',
  },
  '.cm-patch-accept': {
    color: 'var(--lemu-green)',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 600,
  },
  '.cm-patch-accept:hover': {
    textDecoration: 'underline',
  },
  '.cm-patch-reject': {
    color: 'var(--lemu-red)',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: 600,
  },
  '.cm-patch-reject:hover': {
    textDecoration: 'underline',
  },
  '.cm-patch-block': {
    padding: '1px 0',
  },
  '.cm-patch-gutter-accepted': {
    backgroundColor: 'var(--lemu-dim-green)',
  },
  '.cm-patch-focused': {
    outline: '1px solid var(--lemu-blue)',
    outlineOffset: '-1px',
  },
  '.cm-patch-accepted': {
    backgroundColor: 'var(--lemu-dim-green)',
    opacity: 0.5,
  },
  '.cm-patch-rejected': {
    backgroundColor: 'var(--lemu-dim-red)',
    opacity: 0.4,
    textDecoration: 'line-through',
  },
  '.cm-patch-id': {
    display: 'inline-block',
    fontSize: '0.7em',
    color: 'var(--lemu-text-dim)',
    marginRight: '4px',
    fontFamily: 'var(--font-mono)',
  },
});
