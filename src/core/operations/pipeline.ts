import type {
  Operation, OperationResult, PipelineContext, Patch,
  Transaction, HistoryEntry,
} from './types';
import { PipelineStageName } from './types';
import type { OperationRegistry } from './registry';
import { validatePatches, applyPatches, invertPatches } from './patch';

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

    /* 1. ResolveScope */
    const resolvedScope = await this.trace(
      PipelineStageName.ResolveScope,
      operation,
      () => this.registry.resolveScope(operation, ctx),
    );
    const resolvedOp = { ...operation, scope: resolvedScope };

    /* 2. Validate */
    const validationError = await this.trace(
      PipelineStageName.Validate,
      resolvedOp,
      () => this.registry.validate(resolvedOp, ctx),
    );
    if (validationError) {
      return { success: false, error: validationError };
    }

    /* 3. GeneratePatches */
    const patches = await this.trace(
      PipelineStageName.GeneratePatches,
      resolvedOp,
      () => this.registry.generatePatches(resolvedOp, ctx),
    );

    if (patches.length === 0) {
      return { success: false, error: 'Operation produced no patches' };
    }

    /* 4. Validate patches against current document */
    const patchError = await this.trace(
      PipelineStageName.Validate,
      patches,
      () => validatePatches(patches, ctx),
    );
    if (patchError) {
      return { success: false, error: patchError };
    }

    /* 5. Build transaction */
    const inverse = invertPatches(patches);
    const transaction: Transaction = {
      id: generateTransactionId(),
      operation: resolvedOp,
      patches,
      inverse,
      timestamp: Date.now(),
      metadata: {
        duration: Date.now() - startTime,
      },
    };

    /* 6. Commit */
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

    /* 7. Record history */
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
