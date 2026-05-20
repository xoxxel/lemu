import type { OperationHandler, DeleteArgs, Patch, PipelineContext, Scope } from '../types';

export const deleteHandler: OperationHandler<DeleteArgs> = {
  type: 'delete',

  resolveScope(op, _ctx): Scope {
    return op.scope;
  },

  generatePatches(op, ctx): Patch[] {
    const { range } = op.args;
    const clampedStart = Math.max(0, Math.min(range.start, ctx.document.length));
    const clampedEnd = Math.max(clampedStart, Math.min(range.end, ctx.document.length));
    const oldText = ctx.document.slice(clampedStart, clampedEnd);
    return [{
      range: { start: clampedStart, end: clampedEnd },
      oldText,
      newText: '',
    }];
  },

  createInverse(op, patches, _ctx): Patch[] {
    return patches.map(p => ({
      range: p.range,
      oldText: '',
      newText: p.oldText,
    }));
  },

  validate(op, _ctx): string | null {
    if (!op.args.range) return 'Delete: range is required';
    if (typeof op.args.range.start !== 'number') return 'Delete: range.start must be a number';
    if (typeof op.args.range.end !== 'number') return 'Delete: range.end must be a number';
    if (op.args.range.start > op.args.range.end) {
      return 'Delete: range.start must be <= range.end';
    }
    return null;
  },
};
