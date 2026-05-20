import type { ScopeNode, ResolvedScope, ResolvedTarget } from './types';
import type { PipelineContext } from '../types';
import { scopeCategory } from './types';
import { describeScope } from './types';

export function resolveScopeNode(node: ScopeNode, ctx: PipelineContext): ResolvedScope {
  switch (node.type) {
    case 'document':
      return resolveDocument(node, ctx);
    case 'selection':
      return resolveSelection(node, ctx);
    case 'line':
      return resolveLine(node, ctx);
    case 'lineRange':
      return resolveLineRange(node, ctx);
    case 'semantic':
      return resolveSemantic(node, ctx);
    case 'workspace':
      return resolveWorkspace(node, ctx);
  }
}

function resolveDocument(node: ScopeNode & { type: 'document' }, ctx: PipelineContext): ResolvedScope {
  return {
    targets: [{ start: 0, end: ctx.document.length, source: node }],
    label: describeScope(node),
    category: scopeCategory(node),
  };
}

function resolveSelection(node: ScopeNode & { type: 'selection' }, ctx: PipelineContext): ResolvedScope {
  if (!ctx.selection) {
    return {
      targets: [{ start: 0, end: ctx.document.length, source: node }],
      label: 'selection (none — using document)',
      category: 'positional',
    };
  }
  return {
    targets: [{ start: ctx.selection.start, end: ctx.selection.end, source: node }],
    label: describeScope(node),
    category: scopeCategory(node),
  };
}

function resolveLine(node: ScopeNode & { type: 'line' }, ctx: PipelineContext): ResolvedScope {
  const lines = ctx.document.split('\n');
  const lineIdx = Math.max(0, Math.min(node.line, lines.length - 1));
  let start = 0;
  for (let i = 0; i < lineIdx; i++) start += lines[i].length + 1;
  const end = start + lines[lineIdx].length;
  return {
    targets: [{ start, end, source: node, metadata: { lineNumber: lineIdx + 1 } }],
    label: describeScope(node),
    category: scopeCategory(node),
  };
}

function resolveLineRange(node: ScopeNode & { type: 'lineRange' }, ctx: PipelineContext): ResolvedScope {
  const lines = ctx.document.split('\n');
  const startLine = Math.max(0, Math.min(node.startLine, lines.length - 1));
  const endLine = Math.max(startLine + 1, Math.min(node.endLine, lines.length));
  let start = 0;
  for (let i = 0; i < startLine; i++) start += lines[i].length + 1;
  let end = start;
  for (let i = startLine; i < endLine; i++) {
    end += lines[i].length + (i < lines.length - 1 ? 1 : 0);
  }
  return {
    targets: [{ start, end, source: node, metadata: { startLine: startLine + 1, endLine } }],
    label: describeScope(node),
    category: scopeCategory(node),
  };
}

function resolveSemantic(node: ScopeNode & { type: 'semantic' }, ctx: PipelineContext): ResolvedScope {
  return {
    targets: [],
    label: `${node.kind} (not yet supported — no targets)`,
    category: scopeCategory(node),
  };
}

function resolveWorkspace(node: ScopeNode & { type: 'workspace' }, ctx: PipelineContext): ResolvedScope {
  return {
    targets: [],
    label: node.pattern ? `workspace:${node.pattern} (not yet supported)` : 'workspace (not yet supported)',
    category: scopeCategory(node),
  };
}

export function offsetToLine(document: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < document.length; i++) {
    if (document[i] === '\n') line++;
  }
  return line;
}
