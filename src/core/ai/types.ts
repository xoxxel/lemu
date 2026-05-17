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

export interface AIProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
}

export interface AIProvider {
  chat(messages: AIMessage[], tools?: MCPTool[]): Promise<AIMessage>;
  config: AIProviderConfig;
}

export interface AIResult {
  success: boolean;
  message: string;
  data?: unknown;
}
