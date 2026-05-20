import type { Operation, OperationHandler, OperationArgs, PipelineContext, Patch } from './types';

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

  resolveScope(op: Operation, ctx: PipelineContext): import('./types').Scope {
    const handler = this.handlers.get(op.type);
    if (!handler) return op.scope;
    return handler.resolveScope(op, ctx);
  }

  generatePatches(op: Operation, ctx: PipelineContext): Patch[] {
    const handler = this.handlers.get(op.type);
    if (!handler) return [];
    return handler.generatePatches(op, ctx);
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
