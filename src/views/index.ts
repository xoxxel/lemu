import type { ComponentType } from 'react';
import EditorView from './EditorView';
import BrowserView from './BrowserView';
import SearchView from './SearchView';
import TaskView from './TaskView';
import ShellView from './ShellView';
import AIView from './AIView';
import AgentView from './AgentView';
import TextView from './TextView';

export const viewComponentMap: Record<string, ComponentType<{ state: Record<string, unknown> }>> = {
  editor: EditorView,
  browser: BrowserView,
  search: SearchView,
  task: TaskView,
  shell: ShellView,
  ai: AIView,
  agent: AgentView,
  text: TextView,
};

export const viewMeta: Record<string, { label: string; icon: string }> = {
  editor: { label: 'Editor', icon: '\u270E' },
  browser: { label: 'Preview', icon: '\u25C9' },
  search: { label: 'Search', icon: '\u2315' },
  task: { label: 'Tasks', icon: '\u25A0' },
  shell: { label: 'Terminal', icon: '\u276F' },
  ai: { label: 'AI', icon: '\u2728' },
  agent: { label: 'Agent', icon: '\u2699' },
  text: { label: 'Info', icon: '\u2139' },
};
