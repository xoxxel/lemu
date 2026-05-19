export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface MCPToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: MCPToolParameter[];
  execute(args: Record<string, unknown>): Promise<string>;
}

export interface AIResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: MCPTool[];
  signal?: AbortSignal;
}

export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  content?: string;
  finishReason?: string;
  error?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  chat(messages: AIMessage[], options?: ChatOptions): Promise<AIMessage>;
  streamChat?(messages: AIMessage[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  supportsStreaming(): boolean;
  supportsTools(): boolean;
}

export interface ProviderDefinition {
  id: string;
  name?: string;
  apiKey?: string;
  endpoint?: string;
  defaultModel?: string;
  models?: string[];
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  maxTokens?: number;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
}
