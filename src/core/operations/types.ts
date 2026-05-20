import type { ScopeNode, ScopeNodeType, ResolvedTarget, ResolvedScope } from './scope/types';

export type OperationType = 'replace' | 'insert' | 'delete' | 'rangeEdit' | 'aiTransform';

/* ── Scope — delegates to formal scope system ── */
export type { ScopeNode, ScopeNodeType, ResolvedTarget, ResolvedScope };

/* ── Operation args ── */
export interface ReplaceArgs {
  oldText: string;
  newText: string;
}

export interface InsertArgs {
  position: number;
  text: string;
}

export interface DeleteArgs {
  range: { start: number; end: number };
}

export interface RangeEditArgs {
  start: number;
  end: number;
  newText: string;
}

export interface AiTransformArgs {
  prompt: string;
  selectedRange?: { start: number; end: number };
}

export type OperationArgs = ReplaceArgs | InsertArgs | DeleteArgs | RangeEditArgs | AiTransformArgs;

export interface Operation<T extends OperationArgs = OperationArgs> {
  type: OperationType;
  scope: ScopeNode;
  args: T;
  metadata?: Record<string, unknown>;
}

export interface Patch {
  range: { start: number; end: number };
  oldText: string;
  newText: string;
}

export interface Transaction {
  id: string;
  operation: Operation;
  patches: Patch[];
  inverse: Patch[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface OperationResult {
  success: boolean;
  transaction?: Transaction;
  error?: string;
  affectedRange?: { start: number; end: number };
  metadata?: Record<string, unknown>;
}

export interface OperationHandler<T extends OperationArgs = OperationArgs> {
  type: OperationType;
  supportedScopes: ScopeNodeType[];
  generatePatches(op: Operation<T>, ctx: PipelineContext, targets: ResolvedTarget[]): Patch[];
  createInverse(op: Operation<T>, patches: Patch[], ctx: PipelineContext): Patch[];
  validate(op: Operation<T>, ctx: PipelineContext): string | null;
}

export interface PipelineContext {
  document: string;
  path: string;
  selection?: { start: number; end: number };
  state: Record<string, unknown>;
}

export interface PipelineStage<T> {
  name: string;
  run(input: T, ctx: PipelineContext): Promise<T> | T;
}

export type PipelineInput =
  | { kind: 'raw'; text: string }
  | { kind: 'operation'; operation: Operation }
  | { kind: 'patches'; patches: Patch[]; inverse: Patch[] };

export enum PipelineStageName {
  Parse = 'parse',
  ResolveScope = 'resolveScope',
  GeneratePatches = 'generatePatches',
  Validate = 'validate',
  BuildTransaction = 'buildTransaction',
  Commit = 'commit',
  RecordHistory = 'recordHistory',
}

export interface PipelineEvent {
  stage: PipelineStageName;
  input: unknown;
  output: unknown;
  duration: number;
}

export interface HistoryEntry {
  transaction: Transaction;
  timestamp: number;
  documentAfter: string;
}

export interface OperationHistory {
  push(entry: HistoryEntry): void;
  pop(): HistoryEntry | undefined;
  peek(): HistoryEntry | undefined;
  clear(): void;
  getEntries(): HistoryEntry[];
}
