import type { FeedbackEvent } from './types';

export class FeedbackService {
  private current: FeedbackEvent | null = null;
  private listeners = new Set<(event: FeedbackEvent | null) => void>();

  show(event: FeedbackEvent): void {
    if (this.current) {
      console.log('[FEEDBACK] replaced');
    }
    console.log('[FEEDBACK] emitted level=%s message=%s', event.level, event.message);
    if (event.suggestion) console.log('[FEEDBACK] suggestion=%s', event.suggestion);
    this.current = event;
    this.notify();
  }

  clear(): void {
    if (!this.current) return;
    console.log('[FEEDBACK] dismissed');
    this.current = null;
    this.notify();
  }

  subscribe(listener: (event: FeedbackEvent | null) => void): () => void {
    this.listeners.add(listener);
    if (this.current) listener(this.current);
    return () => { this.listeners.delete(listener); };
  }

  get currentFeedback(): FeedbackEvent | null {
    return this.current;
  }

  destroy(): void {
    this.listeners.clear();
    this.current = null;
  }

  private notify(): void {
    const ev = this.current;
    for (const listener of this.listeners) {
      try { listener(ev); } catch { /* isolate */ }
    }
  }
}
