import { eventBus, DomainEventTypes } from '../events';
import { intentPipeline } from '../pipeline';
import { editPipeline } from './edit-pipeline';
import { appContext } from '../context';
import type { Intent } from '../pipeline/types';

export interface AiOrchestratorConfig {
  autoApprove: boolean;
}

class AiOrchestrator {
  private config: AiOrchestratorConfig = { autoApprove: false };
  private initialized = false;
  private unsubs: (() => void)[] = [];

  configure(cfg: Partial<AiOrchestratorConfig>): void {
    this.config = { ...this.config, ...cfg };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    this.unsubs.push(
      intentPipeline.addHook({
        onIntent: async (intent: Intent) => {
          if (intent.source === 'ai') {
            appContext.set('ai:last-intent', intent);
          }
          return intent;
        },
        onStatusChange: async () => {},
        onComplete: async () => {},
      }),
    );

    this.initialized = true;
  }

  async destroy(): Promise<void> {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.initialized = false;
  }
}

export const aiOrchestrator = new AiOrchestrator();
