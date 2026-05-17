import type { AIProvider, AIProviderConfig, AIMessage, MCPTool } from './types';

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 4096;

function getConfig(): AIProviderConfig {
  return {
    apiKey: (typeof window !== 'undefined' ? (window as unknown as Record<string, string>).__LEMU_AI_KEY__ : undefined) as string
      || import.meta.env.VITE_LEMU_AI_API_KEY as string
      || '',
    endpoint: import.meta.env.VITE_LEMU_AI_ENDPOINT as string || DEFAULT_ENDPOINT,
    model: import.meta.env.VITE_LEMU_AI_MODEL as string || DEFAULT_MODEL,
    maxTokens: Number(import.meta.env.VITE_LEMU_AI_MAX_TOKENS) || DEFAULT_MAX_TOKENS,
  };
}

function buildToolsPayload(tools?: MCPTool[]): Array<Record<string, unknown>> | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          t.parameters.map((p) => [
            p.name,
            { type: p.type, description: p.description },
          ])
        ),
        required: t.parameters.filter((p) => p.required).map((p) => p.name),
      },
    },
  }));
}

function buildMessagesPayload(messages: AIMessage[]): Array<Record<string, unknown>> {
  return messages.map((m) => {
    const msg: Record<string, unknown> = { role: m.role, content: m.content };
    if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
    if (m.tool_calls) msg.tool_calls = m.tool_calls;
    return msg;
  });
}

function parseResponse(data: Record<string, unknown>): AIMessage {
  const choice = (data.choices as Array<Record<string, unknown>>)?.[0];
  if (!choice) throw new Error('No response from AI provider');
  const message = choice.message as Record<string, unknown>;
  return {
    role: 'assistant',
    content: (message.content as string) || '',
    tool_calls: message.tool_calls as AIMessage['tool_calls'],
  };
}

export async function createProvider(config?: Partial<AIProviderConfig>): Promise<AIProvider> {
  const base = getConfig();
  const cfg: AIProviderConfig = { ...base, ...config };

  const provider: AIProvider = {
    config: cfg,

    async chat(messages: AIMessage[], tools?: MCPTool[]): Promise<AIMessage> {
      if (!cfg.apiKey) {
        return {
          role: 'assistant',
          content: 'AI provider not configured. Set VITE_LEMU_AI_API_KEY in .env or configure via /ai config.',
        };
      }

      const body: Record<string, unknown> = {
        model: cfg.model,
        messages: buildMessagesPayload(messages),
        max_tokens: cfg.maxTokens,
      };

      const toolsPayload = buildToolsPayload(tools);
      if (toolsPayload) body.tools = toolsPayload;

      const res = await fetch(`${cfg.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI provider error (${res.status}): ${text}`);
      }

      const data = await res.json();
      return parseResponse(data);
    },
  };

  return provider;
}
