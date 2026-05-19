export interface Intent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  source: 'user' | 'ai' | 'plugin' | 'system';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type IntentStatus = 'pending' | 'processing' | 'approved' | 'rejected' | 'completed' | 'failed';

export interface IntentRecord {
  intent: Intent;
  status: IntentStatus;
  result?: unknown;
  error?: string;
  approvedBy?: string;
  processedAt?: number;
}

export type IntentMiddleware = (
  intent: Intent,
  next: (intent: Intent) => Promise<IntentRecord>,
) => Promise<IntentRecord>;

export interface PipelineHook {
  onIntent(intent: Intent): Promise<Intent | null>;
  onStatusChange(record: IntentRecord): Promise<void>;
  onComplete(record: IntentRecord): Promise<void>;
}
