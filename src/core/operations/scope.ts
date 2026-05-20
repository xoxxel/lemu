import type { ScopeNode, PipelineContext, ResolvedTarget } from './types';
import { resolveScopeNode as newResolve } from './scope/resolver';
import { describeScope as newDescribe } from './scope/types';

export function resolveScope(scope: ScopeNode, ctx: PipelineContext): ResolvedTarget[] {
  return newResolve(scope, ctx).targets;
}

export function resolveToOffsets(scope: ScopeNode, ctx: PipelineContext): { start: number; end: number } {
  const targets = newResolve(scope, ctx).targets;
  if (targets.length === 0) return { start: 0, end: 0 };
  return { start: targets[0].start, end: targets[0].end };
}

export function describeScope(scope: ScopeNode): string {
  return newDescribe(scope);
}
