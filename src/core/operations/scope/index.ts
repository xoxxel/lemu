export { ScopeCapabilityRegistry } from './capabilities';
export { parseScope, parseScopeOrThrow, parseScopeWithDefault } from './parser';
export { resolveScopeNode, offsetToLine } from './resolver';
export { isScopeToken, SCOPE_KEYWORDS, SEMANTIC_KEYWORDS, ALL_SCOPE_KEYWORDS } from './grammar';
export { scopeCategory, describeScope, scopeNodeType } from './types';

export type {
  ScopeNodeType, ScopeNode,
  DocumentScopeNode, SelectionScopeNode,
  LineScopeNode, LineRangeScopeNode,
  SemanticScopeNode, WorkspaceScopeNode,
  SemanticKind, ScopeCategory,
  ResolvedTarget, ResolvedScope,
  ScopeCapability, ParseResult,
} from './types';
