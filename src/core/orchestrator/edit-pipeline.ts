import { eventBus, DomainEventTypes } from '../events';
import { computeDiff, formatDiff } from './diff-engine';
import { suggestionStore } from './suggestion-store';
import type { EditSuggestion } from './suggestion-store';

export interface EditProposal {
  filePath: string;
  originalContent: string;
  proposedContent: string;
  source: string;
}

export interface EditPipelineHook {
  onPropose(proposal: EditProposal): Promise<EditProposal | null>;
  onApply(suggestion: EditSuggestion): Promise<void>;
}

class EditPipeline {
  private hooks: EditPipelineHook[] = [];

  addHook(hook: EditPipelineHook): () => void {
    this.hooks.push(hook);
    return () => {
      const idx = this.hooks.indexOf(hook);
      if (idx >= 0) this.hooks.splice(idx, 1);
    };
  }

  async propose(proposal: EditProposal): Promise<EditSuggestion> {
    let processed = proposal;

    for (const hook of this.hooks) {
      const result = await hook.onPropose(processed);
      if (result === null) {
        const sug = suggestionStore.add({
          filePath: processed.filePath,
          originalContent: processed.originalContent,
          proposedContent: processed.proposedContent,
          diff: '',
          source: processed.source,
        });
        suggestionStore.reject(sug.id, 'Blocked by hook');
        return sug;
      }
      processed = result;
    }

    const diff = computeDiff(processed.originalContent, processed.proposedContent);
    const diffText = formatDiff(diff);

    const suggestion = suggestionStore.add({
      filePath: processed.filePath,
      originalContent: processed.originalContent,
      proposedContent: processed.proposedContent,
      diff: diffText,
      source: processed.source,
    });

    eventBus.emit(DomainEventTypes.EditProposed, {
      timestamp: Date.now(),
      filePath: suggestion.filePath,
      originalContent: suggestion.originalContent,
      proposedContent: suggestion.proposedContent,
      diff: suggestion.diff,
      source: suggestion.source,
      suggestionId: suggestion.id,
    });

    return suggestion;
  }

  async approve(suggestionId: string): Promise<EditSuggestion | undefined> {
    const sug = suggestionStore.approve(suggestionId);
    if (!sug) return undefined;

    for (const hook of this.hooks) {
      try { await hook.onApply(sug); } catch { }
    }

    eventBus.emit(DomainEventTypes.EditApplied, {
      timestamp: Date.now(),
      filePath: sug.filePath,
      content: sug.proposedContent,
      suggestionId: sug.id,
    });

    return sug;
  }

  reject(suggestionId: string, reason?: string): EditSuggestion | undefined {
    const sug = suggestionStore.reject(suggestionId, reason);
    if (!sug) return undefined;

    eventBus.emit(DomainEventTypes.EditRejected, {
      timestamp: Date.now(),
      filePath: sug.filePath,
      suggestionId: sug.id,
      reason,
    });

    return sug;
  }
}

export const editPipeline = new EditPipeline();
