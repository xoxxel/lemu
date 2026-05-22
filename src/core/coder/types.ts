import type { Patch } from '../operations/types';

export type OutputFormat = 'fullFile' | 'unified' | 'searchReplace' | 'patches' | 'explanation';

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
  patches?: Patch[];
  output?: string;
  outputFormat: OutputFormat;
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
