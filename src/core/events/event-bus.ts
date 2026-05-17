type EventHandler = (payload?: unknown) => void;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  emit(event: string, payload?: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch {
          // isolate handler errors
        }
      }
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  removeAll(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
