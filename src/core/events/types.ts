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

export const DomainEventTypes = {
  // User intent
  UserIntent: 'user:intent',

  // File system events
  FsOpened: 'fs:opened',
  FsSaved: 'fs:saved',
  FsCopied: 'fs:copied',
  FsMoved: 'fs:moved',
  FsDeleted: 'fs:deleted',
  FsError: 'fs:error',

  // Search events
  SearchStarted: 'search:started',
  SearchCompleted: 'search:completed',
  SearchSelected: 'search:selected',

  // Edit pipeline events
  EditProposed: 'edit:proposed',
  EditApplied: 'edit:applied',
  EditRejected: 'edit:rejected',
  EditReverted: 'edit:reverted',

  // AI orchestration events
  AiSuggestion: 'ai:suggestion',
  AiApproved: 'ai:approved',
  AiRejected: 'ai:rejected',
  AiInferred: 'ai:inferred',

  // Tab events
  TabActivated: 'tab:activated',
  TabStateChanged: 'tab:state-changed',
} as const;

export type DomainEventType = (typeof DomainEventTypes)[keyof typeof DomainEventTypes];

export interface UserIntentEvent extends RuntimeEventBase {
  input: string;
  mode: string;
  source: 'user' | 'ai' | 'plugin';
}

export interface FsOpenedEvent extends RuntimeEventBase {
  path: string;
}

export interface FsSavedEvent extends RuntimeEventBase {
  path: string;
  previousContent: string;
  newContent: string;
}

export interface FsCopiedEvent extends RuntimeEventBase {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
}

export interface FsMovedEvent extends RuntimeEventBase {
  from: string;
  to: string;
  success: boolean;
  error?: string;
}

export interface FsDeletedEvent extends RuntimeEventBase {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  success: boolean;
  error?: string;
}

export interface SearchStartedEvent extends RuntimeEventBase {
  query: string;
  path?: string;
}

export interface SearchCompletedEvent extends RuntimeEventBase {
  query: string;
  results: number;
  duration: number;
}

export interface EditProposedEvent extends RuntimeEventBase {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  diff: string;
  source: string;
  suggestionId: string;
}

export interface EditAppliedEvent extends RuntimeEventBase {
  filePath: string;
  content: string;
  suggestionId?: string;
}

export interface EditRejectedEvent extends RuntimeEventBase {
  filePath: string;
  suggestionId: string;
  reason?: string;
}

export interface AiSuggestionEvent extends RuntimeEventBase {
  type: string;
  description: string;
  payload: unknown;
  suggestionId: string;
}
