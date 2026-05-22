import type { OperationHandler, Patch } from '../types';

export const aiTransformHandler: OperationHandler = {
  type: 'aiTransform',
  supportedScopes: ['document', 'selection', 'line', 'lineRange'],

  generatePatches(op, _ctx, targets) {
    const args = op.args as { patches: Patch[] };
    if (!args.patches || args.patches.length === 0) return [];

    if (targets.length === 0) return args.patches;

    const target = targets[0];
    const filtered = args.patches.filter(p =>
      p.range.start >= target.start && p.range.end <= target.end
    );

    return filtered.length > 0 ? filtered : args.patches;
  },

  createInverse(_op, patches, _ctx) {
    return patches.map(p => ({
      range: { ...p.range },
      oldText: p.newText,
      newText: p.oldText,
    }));
  },

  validate(op, _ctx) {
    const args = op.args as { patches: Patch[] };
    if (!args.patches) return 'AiTransform requires patches';
    if (args.patches.length === 0) return 'AiTransform requires at least one patch';
    for (let i = 0; i < args.patches.length; i++) {
      const p = args.patches[i];
      if (p.range.start < 0 || p.range.end < 0) {
        return `Patch ${i}: invalid range [${p.range.start}, ${p.range.end})`;
      }
      if (typeof p.oldText !== 'string' || typeof p.newText !== 'string') {
        return `Patch ${i}: oldText and newText must be strings`;
      }
    }
    return null;
  },
};
