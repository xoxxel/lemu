import type { RuntimeEventBase } from '../../core/events/types';

export interface FsCopyEvent extends RuntimeEventBase {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
}

export interface FsMoveEvent extends RuntimeEventBase {
  from: string;
  to: string;
  success: boolean;
  error?: string;
}

export interface FsDeleteEvent extends RuntimeEventBase {
  path: string;
  success: boolean;
  error?: string;
}

export interface FsOpenEvent extends RuntimeEventBase {
  path: string;
}
