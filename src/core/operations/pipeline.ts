import type {
  Operation, OperationResult, PipelineContext, Patch,
  Transaction, HistoryEntry,
} from './types';
import { PipelineStageName } from './types';
import type { OperationRegistry } from './registry';
import { validatePatches, applyPatches, invertPatches } from './patch';
import { resolveScopeNode } from './scope/resolver';

export class TransactionPipeline {
  private history: HistoryEntry[] = [];
  private onEvent?: (event: import('./types').PipelineEvent) => void;

  constructor(
    private registry: OperationRegistry,
  ) {}

  onStage(cb: (event: import('./types').PipelineEvent) => void): void {
    this.onEvent = cb;
  }

  async run(
    operation: Operation,
    ctx: PipelineContext,
  ): Promise<OperationResult> {
    const startTime = Date.now();

    /* 1. Validate operation */
    const validationError = await this.trace(
      PipelineStageName.Validate,
      operation,
      () => this.registry.validate(operation, ctx),
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    /* 2. Check scope capability */
    const scopeError = await this.trace(
      PipelineStageName.ResolveScope,
      operation,
      () => this.registry.assertScopeSupported(operation.type, operation.scope.type),
    );
    if (scopeError) {
      return { success: false, error: scopeError };
    }

    /* 3. Resolve scope to concrete targets */
    const resolved = await this.trace(
      PipelineStageName.ResolveScope,
      operation.scope,
      () => resolveScopeNode(operation.scope, ctx),
    );

    if (resolved.targets.length === 0) {
      return { success: false, error: `Scope '${resolved.label}' produced no targets` };
    }

    /* 4. Generate patches from resolved targets */
    const patches = await this.trace(
      PipelineStageName.GeneratePatches,
      operation,
      () => this.registry.generatePatches(operation, ctx, resolved.targets),
    );

    if (patches.length === 0) {
      return { success: false, error: 'Operation produced no patches' };
    }

    /* 5. Validate patches against current document */
    const patchError = await this.trace(
      PipelineStageName.Validate,
      patches,
      () => validatePatches(patches, ctx),
    );
    if (patchError) {
      return { success: false, error: patchError };
    }

    /* 6. Build transaction */
    const inverse = invertPatches(patches);
    const transaction: Transaction = {
      id: generateTransactionId(),
      operation,
      patches,
      inverse,
      timestamp: Date.now(),
      metadata: {
        duration: Date.now() - startTime,
        resolvedScope: resolved.label,
      },
    };

    /* 7. Commit */
    let newDocument: string;
    try {
      newDocument = await this.trace(
        PipelineStageName.Commit,
        transaction,
        () => applyPatches(ctx.document, patches),
      );
    } catch (err) {
      return {
        success: false,
        error: `Commit failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    /* 8. Record history */
    const entry: HistoryEntry = {
      transaction,
      timestamp: Date.now(),
      documentAfter: newDocument,
    };
    await this.trace(
      PipelineStageName.RecordHistory,
      entry,
      () => this.history.push(entry),
    );

    const affectedRange = computeAffectedRange(patches);

    return {
      success: true,
      transaction,
      affectedRange,
      metadata: {
        duration: Date.now() - startTime,
        newDocument,
        resolvedScope: resolved.label,
      },
    };
  }

  async undo(ctx: PipelineContext): Promise<OperationResult | null> {
    const entry = this.history.pop();
    if (!entry) return null;

    const inversePatches = entry.transaction.inverse;
    try {
      const newDocument = applyPatches(ctx.document, inversePatches);
      return {
        success: true,
        metadata: { newDocument },
      };
    } catch (err) {
      return {
        success: false,
        error: `Undo failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  private async trace<T>(stage: PipelineStageName, input: unknown, fn: () => T): Promise<T> {
    const start = Date.now();
    const output = await fn();
    if (this.onEvent) {
      this.onEvent({ stage, input, output, duration: Date.now() - start });
    }
    return output;
  }
}

function generateTransactionId(): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeAffectedRange(patches: Patch[]): { start: number; end: number } {
  if (patches.length === 0) return { start: 0, end: 0 };
  let start = Infinity;
  let end = 0;
  for (const p of patches) {
    if (p.range.start < start) start = p.range.start;
    if (p.range.end > end) end = p.range.end;
  }
  return { start, end };
}
