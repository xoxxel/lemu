export type TabType = 'editor' | 'terminal' | 'preview' | 'task' | 'ai';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  icon: string;
  closable: boolean;
  path?: string;
  sessionId?: string;
  state?: Record<string, unknown>;
}

const TAB_COUNTERS: Record<string, number> = {};

export function createTabId(type: TabType): string {
  const n = (TAB_COUNTERS[type] || 0) + 1;
  TAB_COUNTERS[type] = n;
  return `${type}-${n}`;
}

export const TAB_ICONS: Record<TabType, string> = {
  editor: '\u270E',
  terminal: '\u25A3',
  preview: '\u25C9',
  task: '\u25A0',
  ai: '\u2728',
};

export function friendlyTerminalName(index: number): string {
  const names = ['Terminal #1', 'Terminal #2', 'Terminal #3', 'Dev Server', 'Git Console'];
  return names[index] || `Terminal #${index + 1}`;
}
