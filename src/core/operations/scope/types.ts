export type ScopeNodeType =
  | 'document'
  | 'selection'
  | 'line'
  | 'lineRange'
  | 'semantic'
  | 'workspace';

export type SemanticKind =
  | 'comments'
  | 'strings'
  | 'functions'
  | 'imports'
  | 'types'
  | 'exports';

export type ScopeCategory =
  | 'document'
  | 'positional'
  | 'semantic'
  | 'workspace';

export interface DocumentScopeNode {
  type: 'document';
}

export interface SelectionScopeNode {
  type: 'selection';
}

export interface LineScopeNode {
  type: 'line';
  line: number;
}

export interface LineRangeScopeNode {
  type: 'lineRange';
  startLine: number;
  endLine: number;
}

export interface SemanticScopeNode {
  type: 'semantic';
  kind: SemanticKind;
}

export interface WorkspaceScopeNode {
  type: 'workspace';
  pattern?: string;
}

export type ScopeNode =
  | DocumentScopeNode
  | SelectionScopeNode
  | LineScopeNode
  | LineRangeScopeNode
  | SemanticScopeNode
  | WorkspaceScopeNode;

export interface ParseResult {
  node: ScopeNode | null;
  remaining: string;
}

export interface ResolvedTarget {
  start: number;
  end: number;
  source: ScopeNode;
  metadata?: Record<string, unknown>;
}

export interface ResolvedScope {
  targets: ResolvedTarget[];
  label: string;
  category: ScopeCategory;
}

export interface ScopeCapability {
  operationType: string;
  supportedScopes: ScopeNodeType[];
}

export function scopeCategory(node: ScopeNode): ScopeCategory {
  switch (node.type) {
    case 'document':
      return 'document';
    case 'selection':
    case 'line':
    case 'lineRange':
      return 'positional';
    case 'semantic':
      return 'semantic';
    case 'workspace':
      return 'workspace';
  }
}

export function describeScope(node: ScopeNode): string {
  switch (node.type) {
    case 'document':
      return 'document';
    case 'selection':
      return 'selection';
    case 'line':
      return `line ${node.line}`;
    case 'lineRange':
      return `lines ${node.startLine}-${node.endLine}`;
    case 'semantic':
      return node.kind;
    case 'workspace':
      return node.pattern ? `workspace:${node.pattern}` : 'workspace';
  }
}

export function scopeNodeType(node: ScopeNode): ScopeNodeType {
  return node.type;
}
