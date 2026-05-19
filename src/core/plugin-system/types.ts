import type { ComponentType } from 'react';
import type { Command } from '../commands/types';
import type { PluginAction } from '../actions/types';
import type { Intent } from '../pipeline/types';

// ─── Manifest (static, architectural, version-controlled) ─────────────────────

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST';
  params?: Record<string, string>;
}

export interface ManifestPermission {
  shell?: boolean;
  network?: boolean;
  filesystem?: boolean;
  clipboard?: boolean;
}

export interface ManifestService {
  type: 'openai' | 'custom';
  required: boolean;
  defaultEndpoint?: string;
  defaultModel?: string;
}

export interface ManifestEvent {
  emits?: string[];
  subscribes?: string[];
}

export interface PluginManifest {
  /** High-level capabilities (e.g. "search", "file-editing", "computation") */
  capabilities?: string[];
  /** System resources the plugin needs */
  permissions?: ManifestPermission;
  /** Other plugin IDs this depends on */
  dependencies?: string[];
  /** External service declarations (architectural, not user-configurable) */
  services?: Record<string, ManifestService>;
  /** Internal API endpoints consumed by this plugin */
  apis?: Record<string, ApiEndpoint>;
  /** Event integration */
  events?: ManifestEvent;
}

// ─── Settings (user-configurable, dynamic) ────────────────────────────────────

/** Describes one configurable setting's metadata */
export interface SettingDefinition {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiline';
  label: string;
  description?: string;
  placeholder?: string;
  options?: string[];
}

/** Schema that describes the shape of user-configurable settings */
export type PluginSettingsSchema = Record<string, SettingDefinition>;

/** Actual user-configurable values (defaults + overrides) */
export type PluginSettings = Record<string, unknown>;

// ─── Runtime services ─────────────────────────────────────────────────────────

export interface ApiService {
  call(name: string, params?: Record<string, string>, body?: unknown): Promise<unknown>;
  getUrl(name: string): string;
}

export interface CommandExecutedPayload {
  command: string;
  args: string[];
  result: { success: boolean; message: string; data?: unknown };
  duration: number;
}

export interface AppRenderContext {
  registerWrapper(wrapper: unknown): void;
}

export interface PluginInputPayload {
  input: string;
  tabId: string;
  tabType: string;
  state: Record<string, unknown>;
}

export interface PluginInputResult {
  message?: string;
  state?: Record<string, unknown>;
  openTab?: {
    type: string;
    title?: string;
    state: Record<string, unknown>;
  };
}

export interface PluginDocs {
  overview: string;
  examples?: string;
  workflows?: string;
  troubleshooting?: string;
  tips?: string;
  limitations?: string;
}

export interface PluginView {
  type: string;
  component: ComponentType<{ state: Record<string, unknown> }>;
  meta: { label: string; icon: string };
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  activate?(ctx: PluginContext): Promise<void>;
  deactivate?(ctx: PluginContext): Promise<void>;
  commands?: Command[];
  actions?: PluginAction[];
  getActions?(): PluginAction[];
  views?: PluginView[];
  onConfig?(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  onReady?(ctx: PluginContext): Promise<void>;
  onAppRender?(ctx: AppRenderContext): Promise<void>;
  onCommandExecuted?(payload: CommandExecutedPayload): Promise<void>;
  onInput?(payload: PluginInputPayload): Promise<PluginInputResult | void>;
  onCleanup?(): Promise<void>;
  docs?: PluginDocs;
  onEvent?(event: string, payload?: unknown): Promise<void>;
  onIntent?(intent: Intent): Promise<Intent | null>;
  /** Static architectural declaration — NEVER user-editable */
  manifest?: PluginManifest;
  /** Default user-configurable values */
  settings?: PluginSettings;
  /** Schema describing the settings shape (for validation/UI generation) */
  settingsSchema?: PluginSettingsSchema;
}

export interface ShellService {
  sendInput(input: string, sessionId?: string): void;
  createSession(): void;
  destroySession(id: string): void;
  switchSession(id: string): void;
  listSessions(): Array<{ id: string; cwd: string; shellType: string }>;
}

export interface WorkspaceService {
  addMessage(type: 'user' | 'system' | 'error', content: string, data?: unknown): string;
  updateMessage(id: string, updates: Record<string, unknown>): void;
  getMessages(): Array<{ id: string; type: string; content: string }>;
}

export interface EventBus {
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload?: unknown) => void): () => void;
}

export interface UIService {
  showPanel(id: string, component: unknown): void;
  hidePanel(id: string): void;
  registerAppWrapper(wrapper: unknown): void;
}

export interface CommandRegistry {
  register(cmd: Command): void;
  get(name: string): Command | undefined;
  findByAlias(alias: string): Command | undefined;
  getAll(): Command[];
}

export interface AppContextService {
  get<T = unknown>(key: string): T | undefined;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  has(key: string): boolean;
  onChange(key: string, fn: (key: string, value: unknown, prev: unknown) => void): () => void;
}

export interface StorageService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}

export interface PluginContext {
  shell: ShellService;
  workspace: WorkspaceService;
  events: EventBus;
  commands: CommandRegistry;
  storage: StorageService;
  ui: UIService;
  config: Record<string, unknown>;
  context: AppContextService;
  /** Returns resolved settings for the current plugin (defaults + user overrides) */
  getSettings<T = PluginSettings>(): T;
  actions: {
    register(type: string, action: import('../actions/types').PluginAction): void;
  };
  feedback: {
    error(message: string, meta?: { suggestion?: string; command?: string }): void;
    warning(message: string, meta?: { suggestion?: string; command?: string }): void;
    info(message: string, meta?: { suggestion?: string; command?: string }): void;
    success(message: string, meta?: { suggestion?: string; command?: string }): void;
  };
  views: {
    register(type: string, component: ComponentType<{ state: Record<string, unknown> }>, meta: { label: string; icon: string }): void;
  };
  api: ApiService;
}
