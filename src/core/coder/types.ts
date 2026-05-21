import type { Patch } from '../operations/types';

export interface CodingTask {
  filePath: string;
  instructions: string;
  currentContent: string;
  workspaceContext?: string;
  providerId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CodingResult {
  patches: Patch[];
  explanation?: string;
  engine: string;
  metadata?: Record<string, unknown>;
}

export interface CoderEngine {
  readonly id: string;
  readonly name: string;
  generatePatches(task: CodingTask): Promise<CodingResult>;
  isAvailable(): Promise<boolean>;
}
