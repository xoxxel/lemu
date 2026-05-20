export { TransactionPipeline } from './pipeline';
export { OperationRegistry } from './registry';
export { resolveScope, resolveToOffsets, describeScope } from './scope';
export { applyPatches, validatePatches, invertPatches, collapsePatches } from './patch';
export { replaceHandler, insertHandler, deleteHandler } from './operations';

export { parseScope, parseScopeWithDefault } from './scope/parser';
export { resolveScopeNode } from './scope/resolver';
export { ScopeCapabilityRegistry } from './scope/capabilities';
export { isScopeToken } from './scope/grammar';

export type {
  OperationType, Operation, OperationArgs,
  ReplaceArgs, InsertArgs, DeleteArgs, RangeEditArgs, AiTransformArgs,
  Patch, Transaction, OperationResult,
  OperationHandler, PipelineContext, PipelineStage,
  PipelineInput, PipelineEvent, HistoryEntry, OperationHistory,
  ScopeNode, ScopeNodeType, ResolvedTarget, ResolvedScope,
} from './types';

export type {
  ScopeCategory, SemanticKind,
  DocumentScopeNode, SelectionScopeNode,
  LineScopeNode, LineRangeScopeNode,
  SemanticScopeNode, WorkspaceScopeNode,
} from './scope/types';

export { PipelineStageName } from './types';
