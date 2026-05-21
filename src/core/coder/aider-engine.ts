import type { CoderEngine, CodingTask, CodingResult } from './types';

export class AiderCoderEngine implements CoderEngine {
  readonly id = 'aider';
  readonly name = 'Aider';

  async generatePatches(task: CodingTask): Promise<CodingResult> {
    const res = await fetch('/api/coder/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: task.filePath,
        instructions: task.instructions,
        currentContent: task.currentContent,
        providerId: task.providerId,
        model: task.model,
        temperature: task.temperature,
        maxTokens: task.maxTokens,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Aider engine failed');
    }

    return {
      patches: data.patches,
      explanation: data.explanation,
      engine: this.id,
      metadata: data.metadata,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/coder/health');
      const data = await res.json();
      return data.available === true;
    } catch {
      return false;
    }
  }
}
