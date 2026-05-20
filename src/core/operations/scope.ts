import type { Scope, PipelineContext } from './types';

export function resolveScope(scope: Scope, ctx: PipelineContext): Scope {
  switch (scope.type) {
    case 'document':
      return {
        type: 'document',
      };

    case 'lineRange': {
      const lines = ctx.document.split('\n');
      const startLine = Math.max(0, Math.min(scope.startLine, lines.length - 1));
      const endLine = Math.max(startLine + 1, Math.min(scope.endLine, lines.length));
      return { type: 'lineRange', startLine, endLine };
    }

    case 'selection': {
      if (ctx.selection) {
        const sel = ctx.selection;
        return {
          type: 'lineRange',
          startLine: documentOffsetToLine(ctx.document, sel.start),
          endLine: documentOffsetToLine(ctx.document, sel.end) + 1,
        };
      }
      return { type: 'document' };
    }

    case 'syntax':
    case 'workspace':
      return scope;
  }
}

export function resolveToOffsets(scope: Scope, ctx: PipelineContext): { start: number; end: number } {
  switch (scope.type) {
    case 'document':
      return { start: 0, end: ctx.document.length };

    case 'lineRange': {
      const lines = ctx.document.split('\n');
      let start = 0;
      for (let i = 0; i < scope.startLine && i < lines.length; i++) {
        start += lines[i].length + 1;
      }
      let end = start;
      for (let i = scope.startLine; i < scope.endLine && i < lines.length; i++) {
        end += lines[i].length + (i < lines.length - 1 ? 1 : 0);
      }
      return { start, end };
    }

    case 'selection':
      return ctx.selection ?? { start: 0, end: 0 };

    case 'syntax':
      return { start: 0, end: ctx.document.length };

    case 'workspace':
      return { start: 0, end: ctx.document.length };
  }
}

export function describeScope(scope: Scope): string {
  switch (scope.type) {
    case 'document':
      return 'entire document';
    case 'lineRange':
      return `lines ${scope.startLine + 1}-${scope.endLine}`;
    case 'selection':
      return 'active selection';
    case 'syntax':
      return scope.kind;
    case 'workspace':
      return scope.pattern ? `workspace: ${scope.pattern}` : 'entire workspace';
  }
}

function documentOffsetToLine(document: string, offset: number): number {
  let line = 0;
  for (let i = 0; i < offset && i < document.length; i++) {
    if (document[i] === '\n') line++;
  }
  return line;
}
