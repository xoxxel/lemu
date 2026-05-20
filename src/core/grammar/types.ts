// ---------------------------------------------------------------------------
// Tokens (lexer output)
// ---------------------------------------------------------------------------

export type TokenType =
  | 'prefix'
  | 'ident'
  | 'string'
  | 'pipe'
  | 'lparen'
  | 'rparen'
  | 'bang'
  | 'whitespace'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// AST nodes (parser output)
// ---------------------------------------------------------------------------

export type AstNodeType =
  | 'sequence'
  | 'command'
  | 'action'
  | 'help'
  | 'terminal'
  | 'expression'
  | 'pipe'
  | 'literal'
  | 'inline-command';

export interface AstNode {
  type: AstNodeType;
  raw: string;
  start: number;
  end: number;
  children?: AstNode[];
}

export interface SequenceNode extends AstNode {
  type: 'sequence';
  children: AstNode[];
}

export interface CommandNode extends AstNode {
  type: 'command';
  name: string;
  args: string[];
}

export interface ActionNode extends AstNode {
  type: 'action';
  id: string;
  global: boolean;
  query: string;
}

export interface HelpNode extends AstNode {
  type: 'help';
  topic: string;
}

export interface TerminalNode extends AstNode {
  type: 'terminal';
  command: string;
}

export interface PipeNode extends AstNode {
  type: 'pipe';
  children: [CommandNode, ...AstNode[]];
}

export interface ExpressionNode extends AstNode {
  type: 'expression';
  body: string;
}

export interface LiteralNode extends AstNode {
  type: 'literal';
  text: string;
}

export interface InlineCommandNode extends AstNode {
  type: 'inline-command';
  name: string;
  args: string[];
}

// ---------------------------------------------------------------------------
// Parsing / Execution context
// ---------------------------------------------------------------------------

export interface GrammarContext {
  activeTabType: string | null;
  activeTabId: string | null;
  pinned: boolean;
  query: string;
}

export interface GrammarSuggestion {
  value: string;
  description: string;
  type: 'command' | 'action' | 'help' | 'terminal' | 'file' | 'argument';
  detail?: string;
  usage?: string;
}

// ---------------------------------------------------------------------------
// Grammar definition (unified registration)
// ---------------------------------------------------------------------------

export type Namespace = 'runtime' | 'plugin' | 'global';
export type Prefix = '/' | '>' | '*>' | ':' | '@';

export interface GrammarArgDef {
  name: string;
  type: 'string' | 'path' | 'number' | 'select';
  required?: boolean;
  suggest?: (ctx: GrammarContext, partial: string) => GrammarSuggestion[];
}

export interface GrammarDefinition {
  id: string;
  namespace: Namespace;
  title: string;
  description?: string;
  usage?: string;
  examples?: string[];
  aliases?: string[];
  args?: GrammarArgDef[];
  execute: (ctx: GrammarExecuteContext) => Promise<string | void>;
}

export interface GrammarExecuteContext {
  node: AstNode;
  context: GrammarContext;
  addTab: (type: string, title: string, state?: Record<string, unknown>) => string;
  pin: () => void;
  unpin: () => void;
}

export interface ParseResult {
  node: AstNode | null;
  error?: string;
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

export interface ScopeDefinition {
  id: string;
  label: string;
  prefixes: Prefix[];
  parentId: string | null;
}

export interface ScopeContext {
  activeScope: string;
  availableScopes: ScopeDefinition[];
  tabType: string | null;
}
