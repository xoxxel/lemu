import type { ComponentType } from 'react';
import type { Command } from '../commands/types';
import type { PluginAction } from '../actions/types';

export interface CommandExecutedPayload {
  command: string;
  args: string[];
  result: { success: boolean; message: string; data?: unknown };
  duration: number;
}

export interface AppRenderContext {
  registerWrapper(wrapper: unknown): void;
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
  activate(ctx: PluginContext): Promise<void>;
  deactivate?(ctx: PluginContext): Promise<void>;
  commands?: Command[];
  actions?: PluginAction[];
  getActions?(): PluginAction[];
  views?: PluginView[];
  onConfig?(config: Record<string, unknown>): Promise<Record<string, unknown>>;
  onReady?(ctx: PluginContext): Promise<void>;
  onCommandExecuted?(payload: CommandExecutedPayload): Promise<void>;
  onAppRender?(ctx: AppRenderContext): Promise<void>;
  onCleanup?(): Promise<void>;
  docs?: PluginDocs;
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
}
