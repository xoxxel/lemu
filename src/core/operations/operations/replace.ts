import type { OperationHandler, ReplaceArgs, Patch, PipelineContext, ResolvedTarget } from '../types';

export const replaceHandler: OperationHandler<ReplaceArgs> = {
  type: 'replace',

  supportedScopes: ['document', 'lineRange', 'line', 'selection'],

  generatePatches(op, ctx, targets): Patch[] {
    const { oldText, newText } = op.args;
    const patches: Patch[] = [];
    const seen = new Set<number>();

    for (const target of targets) {
      const searchRegion = ctx.document.slice(target.start, target.end);
      let pos = 0;

      while (pos < searchRegion.length) {
        const idx = searchRegion.indexOf(oldText, pos);
        if (idx === -1) break;
        const absoluteStart = target.start + idx;
        const absoluteEnd = absoluteStart + oldText.length;
        if (!seen.has(absoluteStart)) {
          patches.push({
            range: { start: absoluteStart, end: absoluteEnd },
            oldText,
            newText,
          });
          seen.add(absoluteStart);
        }
        pos = idx + oldText.length;
      }
    }

    return patches;
  },

  createInverse(_op, patches, _ctx): Patch[] {
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
