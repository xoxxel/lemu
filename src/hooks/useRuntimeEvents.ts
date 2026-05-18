import { useState, useEffect, useCallback } from 'react';
import { eventBus, RuntimeEventTypes } from '../core/events';

const PLUGIN_EVENT_TYPES = [
  'fs:copy',
  'fs:move',
  'fs:delete',
  'fs:open',
  'fs:create',
] as const;

export interface Operation {
  id: string;
  message: string;
  kind: 'success' | 'info';
}

function describeOp(eventType: string, payload: unknown): string | null {
  switch (eventType) {
    case 'fs:copy': {
      const p = payload as { source: string; destination: string; success: boolean };
      if (p.success) return `Copied ${p.source} \u2192 ${p.destination}`;
      return null;
    }
    case 'fs:move': {
      const p = payload as { from: string; to: string; success: boolean };
      if (p.success) return `Moved ${p.from} \u2192 ${p.to}`;
      return null;
    }
    case 'fs:delete': {
      const p = payload as { path: string; success: boolean };
      if (p.success) return `Deleted ${p.path}`;
      return null;
    }
    case 'fs:create': {
      const p = payload as { path: string };
      return `Created ${p.path}`;
    }
    case 'fs:open': {
      const p = payload as { path: string };
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

    const watchedTypes: readonly string[] = [
      ...Object.values(RuntimeEventTypes),
      ...PLUGIN_EVENT_TYPES,
    ];
    for (const type of watchedTypes) {
      const unsub = eventBus.on(type, (payload) => handleEvent(type, payload));
      unsubs.push(unsub);
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, []);

  return { operations, dismiss };
}
