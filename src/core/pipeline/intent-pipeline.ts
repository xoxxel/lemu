import { eventBus, DomainEventTypes } from '../events';
import type { Intent, IntentMiddleware, IntentRecord, IntentStatus, PipelineHook } from './types';

let counter = 0;

export class IntentPipeline {
  private middlewares: IntentMiddleware[] = [];
  private hooks: PipelineHook[] = [];
  private records = new Map<string, IntentRecord>();

  use(mw: IntentMiddleware): void {
    this.middlewares.push(mw);
  }

  addHook(hook: PipelineHook): () => void {
    this.hooks.push(hook);
    return () => {
      const idx = this.hooks.indexOf(hook);
      if (idx >= 0) this.hooks.splice(idx, 1);
    };
  }

  async submit(intent: Intent): Promise<IntentRecord> {
    let processed = intent;

    for (const hook of this.hooks) {
      const result = await hook.onIntent(processed);
      if (result === null) {
        const record: IntentRecord = { intent: processed, status: 'rejected', error: 'Blocked by hook' };
        this.records.set(intent.id, record);
        return record;
      }
      processed = result;
    }

    const pipeline = this.buildPipeline();
    const record = await pipeline(processed);
    this.records.set(intent.id, record);

    for (const hook of this.hooks) {
      try { await hook.onComplete(record); } catch { }
    }

    eventBus.emit(DomainEventTypes.UserIntent, {
      timestamp: Date.now(),
      input: JSON.stringify(intent.payload),
      mode: intent.type,
      source: intent.source,
    });

    return record;
  }

  getRecord(id: string): IntentRecord | undefined {
    return this.records.get(id);
  }

  getRecords(): IntentRecord[] {
    return Array.from(this.records.values());
  }

  private buildPipeline(): (intent: Intent) => Promise<IntentRecord> {
    const chain = [...this.middlewares];
    let base: (intent: Intent) => Promise<IntentRecord> = async (intent) => {
      const record: IntentRecord = {
        intent,
        status: 'completed',
        processedAt: Date.now(),
      };
      return record;
    };

    for (let i = chain.length - 1; i >= 0; i--) {
      const current = chain[i];
      const next = base;
      base = async (intent) => current(intent, next);
    }

    return base;
  }
}

export const intentPipeline = new IntentPipeline();
