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

export function OperationalFeed() {
  const { operations, dismiss } = useRuntimeEvents();

  if (operations.length === 0) return null;

  return (
    <div className="op-feed">
      {operations.map((op) => (
        <FeedEntry key={op.id} op={op} onDismiss={dismiss} />
      ))}
    </div>
  );
}
