export type OperationType = 'replace' | 'insert' | 'delete' | 'rangeEdit' | 'aiTransform';

export type ScopeType = 'document' | 'lineRange' | 'selection' | 'syntax' | 'workspace';

export interface DocumentScope {
  type: 'document';
}

export interface LineRangeScope {
  type: 'lineRange';
  startLine: number;
  endLine: number;
}

export interface SelectionScope {
  type: 'selection';
}

export interface SyntaxScope {
  type: 'syntax';
  kind: string;
}

export interface WorkspaceScope {
  type: 'workspace';
  pattern?: string;
}

export type Scope = DocumentScope | LineRangeScope | SelectionScope | SyntaxScope | WorkspaceScope;

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
  scope: Scope;
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
  resolveScope(op: Operation<T>, ctx: PipelineContext): Scope;
  generatePatches(op: Operation<T>, ctx: PipelineContext): Patch[];
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

export interface OperationScopeResolver {
  resolve(scope: Scope, ctx: PipelineContext): Scope;
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
