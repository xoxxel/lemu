type EventHandler = (payload?: unknown) => void;
type WildcardHandler = (event: string, payload?: unknown) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<WildcardHandler>();

  emit(event: string, payload?: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(payload); } catch { }
      }
    }
    for (const handler of this.wildcardHandlers) {
      try { handler(event, payload); } catch { }
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (event === '*') {
      const wcHandler: WildcardHandler = (_event, payload) => handler(payload);
      this.wildcardHandlers.add(wcHandler);
      return () => { this.wildcardHandlers.delete(wcHandler); };
    }
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => { this.handlers.get(event)?.delete(handler); };
  }

  onAny(handler: WildcardHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => { this.wildcardHandlers.delete(handler); };
  }

  removeAll(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
  }
}

export const eventBus = new EventBus();
