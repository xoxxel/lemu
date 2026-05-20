import type { OperationHandler, InsertArgs, Patch, PipelineContext, Scope } from '../types';

export const insertHandler: OperationHandler<InsertArgs> = {
  type: 'insert',

  resolveScope(op, _ctx): Scope {
    return op.scope;
  },

  generatePatches(op, ctx): Patch[] {
    const { position, text } = op.args;
    const clampedPos = Math.max(0, Math.min(position, ctx.document.length));
    return [{
      range: { start: clampedPos, end: clampedPos },
      oldText: '',
      newText: text,
    }];
  },

  createInverse(op, patches, _ctx): Patch[] {
    return patches.map(p => ({
      range: { start: p.range.start, end: p.range.start + p.newText.length },
      oldText: p.newText,
      newText: '',
    }));
  },

  validate(op, _ctx): string | null {
    if (typeof op.args.position !== 'number') return 'Insert: position is required';
    if (!op.args.text) return 'Insert: text is required';
    if (op.args.position < 0) return 'Insert: position must be >= 0';
    return null;
  },
};
