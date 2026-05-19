import { aiOrchestrator } from './ai-orchestrator';
import { intentPipeline } from '../pipeline';

class SystemOrchestrator {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await aiOrchestrator.init();
    this.initialized = true;
  }

  async destroy(): Promise<void> {
    await aiOrchestrator.destroy();
    this.initialized = false;
  }

  getPipeline(): typeof intentPipeline {
    return intentPipeline;
  }
}

export const orchestrator = new SystemOrchestrator();
