import type { Patch, PipelineContext } from './types';

export function applyPatches(document: string, patches: Patch[]): string {
  const sorted = [...patches].sort((a, b) => a.range.start - b.range.start);
  let result = '';
  let lastEnd = 0;

  for (const patch of sorted) {
    if (patch.range.start < lastEnd) {
      throw new Error(`Overlapping patches: ${JSON.stringify(patch.range)} overlaps previous end ${lastEnd}`);
    }
    result += document.slice(lastEnd, patch.range.start);
    result += patch.newText;
    lastEnd = patch.range.end;
  }

  result += document.slice(lastEnd);
  return result;
}

export function validatePatches(patches: Patch[], ctx: PipelineContext): string | null {
  for (let i = 0; i < patches.length; i++) {
    const p = patches[i];

    if (p.range.start < 0 || p.range.end > ctx.document.length) {
      return `Patch ${i}: range [${p.range.start}, ${p.range.end}) exceeds document bounds [0, ${ctx.document.length})`;
    }

    if (p.range.start > p.range.end) {
      return `Patch ${i}: invalid range — start (${p.range.start}) > end (${p.range.end})`;
    }

    const actualOld = ctx.document.slice(p.range.start, p.range.end);
    if (actualOld !== p.oldText) {
      return `Patch ${i}: oldText mismatch at [${p.range.start}, ${p.range.end}). Got '${actualOld}', expected '${p.oldText}'`;
    }
  }

  return null;
}

export function invertPatches(patches: Patch[]): Patch[] {
  return patches.map(p => ({
    range: p.range,
    oldText: p.newText,
    newText: p.oldText,
  }));
}

export function collapsePatches(patches: Patch[]): Patch[] {
  if (patches.length <= 1) return patches;

  const sorted = [...patches].sort((a, b) => a.range.start - b.range.start);
  const collapsed: Patch[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (current.range.end === next.range.start) {
      current = {
        range: { start: current.range.start, end: next.range.end },
        oldText: current.oldText + next.oldText,
        newText: current.newText + next.newText,
      };
    } else {
      collapsed.push(current);
      current = next;
    }
  }
  collapsed.push(current);
  return collapsed;
}
