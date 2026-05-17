export interface Tab {
  id: string;
  type: string;
  title: string;
  icon: string;
  closable: boolean;
  path?: string;
  sessionId?: string;
  state?: Record<string, unknown>;
}

const TAB_COUNTERS: Record<string, number> = {};

export function createTabId(type: string): string {
  const n = (TAB_COUNTERS[type] || 0) + 1;
  TAB_COUNTERS[type] = n;
  return `${type}-${n}`;
}
