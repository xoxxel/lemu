import { forwardRef, useImperativeHandle } from 'react';
import { useRuntimeEvents, type Operation } from '../hooks/useRuntimeEvents';

function FeedEntry({ op, onDismiss }: { op: Operation; onDismiss: (id: string) => void }) {
  return (
    <div
      className={`op-feed-entry op-feed-${op.kind}`}
      onClick={() => onDismiss(op.id)}
    >
      <span className="op-feed-message">{op.message}</span>
    </div>
  );
}

export const OperationalFeed = forwardRef<{ clearAll: () => void }, {}>(function OperationalFeed(_props, ref) {
  const { operations, dismiss, clearAll } = useRuntimeEvents();

  useImperativeHandle(ref, () => ({ clearAll }));

  if (operations.length === 0) return null;

  return (
    <div className="op-feed">
      {operations.map((op) => (
        <FeedEntry key={op.id} op={op} onDismiss={dismiss} />
      ))}
    </div>
  );
});
