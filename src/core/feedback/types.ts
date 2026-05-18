export type FeedbackLevel = 'error' | 'warning' | 'info' | 'success';

export interface FeedbackEvent {
  level: FeedbackLevel;
  message: string;
  suggestion?: string;
  command?: string;
  dismissible?: boolean;
}
