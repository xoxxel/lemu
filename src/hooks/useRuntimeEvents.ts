import { useState, useEffect, useCallback } from 'react';
import { eventBus, RuntimeEventTypes } from '../core/events';
import type { FsCopyEvent, FsDeleteEvent, FsOpenEvent, FsCreateEvent, FsMoveEvent } from '../core/events/types';

export interface Operation {
  id: string;
  message: string;
  kind: 'success' | 'info';
}

function describeOp(eventType: string, payload: unknown): string | null {
  switch (eventType) {
    case RuntimeEventTypes.FsCopy: {
      const p = payload as FsCopyEvent;
      if (p.success) return `Copied ${p.src} \u2192 ${p.dest}`;
      return null;
    }
    case RuntimeEventTypes.FsMove: {
      const p = payload as FsMoveEvent;
      if (p.success) return `Moved ${p.src} \u2192 ${p.dest}`;
      return null;
    }
    case RuntimeEventTypes.FsDelete: {
      const p = payload as FsDeleteEvent;
      if (p.success) return `Deleted ${p.path}`;
      return null;
    }
    case RuntimeEventTypes.FsCreate: {
      const p = payload as FsCreateEvent;
      return `Created ${p.path}`;
    }
    case RuntimeEventTypes.FsOpen: {
      const p = payload as FsOpenEvent;
      return `Opened ${p.path}`;
    }
    default:
      return null;
  }
}

let opCounter = 0;

export function useRuntimeEvents() {
  const [operations, setOperations] = useState<Operation[]>([]);

  const dismiss = useCallback((id: string) => {
    setOperations((prev) => prev.filter((o) => o.id !== id));
  }, []);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const handleEvent = (eventType: string, payload: unknown) => {
      const message = describeOp(eventType, payload);
      if (!message) return;

      const id = `op-${++opCounter}-${Date.now()}`;
      const op: Operation = { id, message, kind: 'success' };

      setOperations((prev) => [...prev, op]);
      setTimeout(() => {
        setOperations((prev) => prev.filter((o) => o.id !== id));
      }, 3000);
    };

    for (const type of Object.values(RuntimeEventTypes)) {
      const unsub = eventBus.on(type, (payload) => handleEvent(type, payload));
      unsubs.push(unsub);
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  return { operations, dismiss };
}
