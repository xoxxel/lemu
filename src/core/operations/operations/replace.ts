import type { OperationHandler, ReplaceArgs, Patch, PipelineContext, Scope } from '../types';
import { resolveToOffsets } from '../scope';

export const replaceHandler: OperationHandler<ReplaceArgs> = {
  type: 'replace',

  resolveScope(op, ctx): Scope {
    if (op.scope.type === 'document' || op.scope.type === 'lineRange' || op.scope.type === 'selection') {
      return op.scope;
    }
    return { type: 'document' };
  },

  generatePatches(op, ctx): Patch[] {
    const { oldText, newText } = op.args;
    const bounds = resolveToOffsets(op.scope, ctx);
    const searchStart = bounds.start;
    const searchEnd = bounds.end;
    const searchRegion = ctx.document.slice(searchStart, searchEnd);

    const patches: Patch[] = [];
    let pos = 0;

    while (pos < searchRegion.length) {
      const idx = searchRegion.indexOf(oldText, pos);
      if (idx === -1) break;
      const absoluteStart = searchStart + idx;
      const absoluteEnd = absoluteStart + oldText.length;
      patches.push({
        range: { start: absoluteStart, end: absoluteEnd },
        oldText,
        newText,
      });
      pos = idx + oldText.length;
    }

    return patches;
  },

  createInverse(op, patches, _ctx): Patch[] {
    return patches.map(p => ({
      range: p.range,
      oldText: p.newText,
      newText: p.oldText,
    }));
  },

  validate(op, _ctx): string | null {
    if (!op.args.oldText) return 'Replace: oldText is required';
    if (op.args.newText === undefined) return 'Replace: newText is required';
    return null;
  },
};
