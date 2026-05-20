export { TransactionPipeline } from './pipeline';
export { OperationRegistry } from './registry';
export { resolveScope, resolveToOffsets, describeScope } from './scope';
export { applyPatches, validatePatches, invertPatches, collapsePatches } from './patch';
export { replaceHandler, insertHandler, deleteHandler } from './operations';

export type {
  OperationType, ScopeType, Scope,
  DocumentScope, LineRangeScope, SelectionScope, SyntaxScope, WorkspaceScope,
  Operation, OperationArgs,
  ReplaceArgs, InsertArgs, DeleteArgs, RangeEditArgs, AiTransformArgs,
  Patch, Transaction, OperationResult,
  OperationHandler, PipelineContext, PipelineStage,
  PipelineInput, PipelineEvent, HistoryEntry, OperationHistory,
} from './types';

export { PipelineStageName } from './types';
