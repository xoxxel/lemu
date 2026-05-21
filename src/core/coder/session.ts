import type { Patch } from '../operations/types';

export interface SessionSnapshot {
  content: string;
  cursorPosition?: number;
  selection?: { start: number; end: number };
}

export type PatchState = 'pending' | 'accepted' | 'rejected';

export interface AiGeneratedPatch {
  id: string;
  index: number;
  patch: Patch;
  state: PatchState;
  dependsOn?: string[];
  reason?: string;
}

export interface EngineMetadata {
  engineId: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  duration?: number;
  outputFormat: string;
}

export interface AISessionData {
  sessionId: string;
  filePath: string;
  instructions: string;
  originalSnapshot: SessionSnapshot;
  generatedPatches: AiGeneratedPatch[];
  patchStates: Map<string, PatchState>;
  timestamp: number;
  engineMetadata: EngineMetadata;
}

export function createAiGeneratedPatch(index: number, patch: Patch, dependsOn?: string[]): AiGeneratedPatch {
  return {
    id: `patch-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    index,
    patch,
    state: 'pending',
    dependsOn,
  };
}

export class AISession {
  public readonly sessionId: string;
  public readonly filePath: string;
  public readonly instructions: string;
  public readonly originalSnapshot: SessionSnapshot;
  public readonly generatedPatches: AiGeneratedPatch[];
  public readonly patchStates: Map<string, PatchState>;
  public readonly timestamp: number;
  public readonly engineMetadata: EngineMetadata;
  private _closed = false;

  constructor(data: AISessionData) {
    this.sessionId = data.sessionId;
    this.filePath = data.filePath;
    this.instructions = data.instructions;
    this.originalSnapshot = data.originalSnapshot;
    this.generatedPatches = data.generatedPatches;
    this.patchStates = data.patchStates;
    this.timestamp = data.timestamp;
    this.engineMetadata = data.engineMetadata;
  }

  get closed(): boolean {
    return this._closed;
  }

  getPatchState(patchId: string): PatchState {
    return this.patchStates.get(patchId) ?? 'pending';
  }

  acceptPatch(patchId: string): void {
    if (this._closed) return;
    this.patchStates.set(patchId, 'accepted');
    const p = this.generatedPatches.find(p => p.id === patchId);
    if (p) p.state = 'accepted';
  }

  rejectPatch(patchId: string, reason?: string): void {
    if (this._closed) return;
    this.patchStates.set(patchId, 'rejected');
    const p = this.generatedPatches.find(p => p.id === patchId);
    if (p) {
      p.state = 'rejected';
      p.reason = reason;
    }
  }

  get pendingCount(): number {
    return this.generatedPatches.filter(p => this.getPatchState(p.id) === 'pending').length;
  }

  get acceptedCount(): number {
    return this.generatedPatches.filter(p => this.getPatchState(p.id) === 'accepted').length;
  }

  get rejectedCount(): number {
    return this.generatedPatches.filter(p => this.getPatchState(p.id) === 'rejected').length;
  }

  get allResolved(): boolean {
    return this.pendingCount === 0;
  }

  close(): void {
    this._closed = true;
  }

  toJSON(): AISessionData {
    return {
      sessionId: this.sessionId,
      filePath: this.filePath,
      instructions: this.instructions,
      originalSnapshot: { ...this.originalSnapshot },
      generatedPatches: this.generatedPatches.map(p => ({ ...p })),
      patchStates: new Map(this.patchStates),
      timestamp: this.timestamp,
      engineMetadata: { ...this.engineMetadata },
    };
  }

  static create(
    filePath: string,
    instructions: string,
    snapshot: SessionSnapshot,
    patches: AiGeneratedPatch[],
    engineMetadata: EngineMetadata,
    sessionId?: string,
  ): AISession {
    const patchStates = new Map<string, PatchState>();
    for (const p of patches) {
      patchStates.set(p.id, 'pending');
    }
    const data: AISessionData = {
      sessionId: sessionId || `ai-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      filePath,
      instructions,
      originalSnapshot: snapshot,
      generatedPatches: patches,
      patchStates,
      timestamp: Date.now(),
      engineMetadata,
    };
    return new AISession(data);
  }
}
