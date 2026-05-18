import type { FeedbackEvent } from '../core/feedback/types';

interface FeedbackBarProps {
  feedback: FeedbackEvent | null;
  onDismiss: () => void;
}

const levelLabels: Record<string, string> = {
  error: '\u2716',
  warning: '\u26A0',
  info: '\u2139',
  success: '\u2714',
};

export default function FeedbackBar({ feedback, onDismiss }: FeedbackBarProps) {
  if (!feedback) return null;

  return (
    <div className={`feedback-bar feedback-${feedback.level}`}>
      <span className="feedback-icon">{levelLabels[feedback.level] ?? ''}</span>
      <span className="feedback-message">{feedback.message}</span>
      {feedback.suggestion && (
        <span className="feedback-suggestion">{feedback.suggestion}</span>
      )}
      <button
        className="feedback-dismiss"
        onMouseDown={(e) => {
          e.preventDefault();
          onDismiss();
        }}
        aria-label="Dismiss"
      >
        {'\u2715'}
      </button>
    </div>
  );
}
