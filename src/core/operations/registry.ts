import type { Operation, OperationHandler, OperationArgs, PipelineContext, Patch, ResolvedTarget } from './types';

export class OperationRegistry {
  private handlers = new Map<string, OperationHandler>();

  register(handler: OperationHandler): void {
    this.handlers.set(handler.type, handler);
  }

  get(type: string): OperationHandler | undefined {
    return this.handlers.get(type);
  }

  getAll(): OperationHandler[] {
    return Array.from(this.handlers.values());
  }

  getSupportedScopes(type: string): import('./scope/types').ScopeNodeType[] {
    const handler = this.handlers.get(type);
    return handler?.supportedScopes ?? ['document'];
  }

  assertScopeSupported(type: string, scopeType: import('./scope/types').ScopeNodeType): string | null {
    const handler = this.handlers.get(type);
    if (!handler) return null;
    if (!handler.supportedScopes.includes(scopeType)) {
      return `Operation '${type}' does not support scope '${scopeType}'. Supported: ${handler.supportedScopes.join(', ')}`;
    }
    return null;
  }

  generatePatches(op: Operation, ctx: PipelineContext, targets: ResolvedTarget[]): Patch[] {
    const handler = this.handlers.get(op.type);
    if (!handler) return [];
    return handler.generatePatches(op, ctx, targets);
  }

  createInverse(op: Operation, patches: Patch[], ctx: PipelineContext): Patch[] {
    const handler = this.handlers.get(op.type);
    if (!handler) return [];
    return handler.createInverse(op, patches, ctx);
  }

  validate(op: Operation, ctx: PipelineContext): string | null {
    const handler = this.handlers.get(op.type);
    if (!handler) return `No handler registered for operation type '${op.type}'`;
    return handler.validate(op, ctx);
  }
}
