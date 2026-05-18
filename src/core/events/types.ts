export interface RuntimeEventBase {
  timestamp: number;
}

export interface CommandStartEvent extends RuntimeEventBase {
  command: string;
  args: string[];
}

export interface CommandSuccessEvent extends RuntimeEventBase {
  command: string;
  args: string[];
  duration: number;
  message: string;
}

export interface CommandErrorEvent extends RuntimeEventBase {
  command: string;
  args: string[];
  message: string;
  suggestion?: string;
}

export interface UiTabOpenedEvent extends RuntimeEventBase {
  type: string;
  title: string;
}

export interface UiTabClosedEvent extends RuntimeEventBase {
  type: string;
  title: string;
}

export interface UiFocusModeChangedEvent extends RuntimeEventBase {
  mode: string;
}

export interface RuntimeReadyEvent extends RuntimeEventBase {}

export interface PluginLoadedEvent extends RuntimeEventBase {
  id: string;
  name: string;
}

export interface PluginErrorEvent extends RuntimeEventBase {
  id: string;
  message: string;
}

export type RuntimeEventPayload =
  | CommandStartEvent
  | CommandSuccessEvent
  | CommandErrorEvent
  | UiTabOpenedEvent
  | UiTabClosedEvent
  | UiFocusModeChangedEvent
  | RuntimeReadyEvent
  | PluginLoadedEvent
  | PluginErrorEvent;

export const RuntimeEventTypes = {
  CommandStart: 'command:start',
  CommandSuccess: 'command:success',
  CommandError: 'command:error',
  UiTabOpened: 'ui:tab-opened',
  UiTabClosed: 'ui:tab-closed',
  UiFocusModeChanged: 'ui:focus-mode-changed',
  RuntimeReady: 'runtime:ready',
  PluginLoaded: 'plugin:loaded',
  PluginError: 'plugin:error',
} as const;

export type RuntimeEventType = (typeof RuntimeEventTypes)[keyof typeof RuntimeEventTypes];
