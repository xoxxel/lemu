import type { AIProvider, AIMessage, ChatOptions, StreamChunk } from '../types';
import type { MCPTool } from '../types';

function buildToolsPayload(tools: MCPTool[]): Array<Record<string, unknown>> {
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

export function createOpenAIProvider(config: {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  maxTokens?: number;
}): AIProvider {
  const endpoint = (config.endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '');

  const provider: AIProvider = {
    id: 'openai',
    name: 'OpenAI',

    supportsStreaming() { return true; },
    supportsTools() { return true; },

    async chat(messages, options) {
      const model = options?.model || config.model || 'gpt-4o';
      const maxTokens = options?.maxTokens || config.maxTokens || 4096;
      const tools = options?.tools;

      const body: Record<string, unknown> = {
        model,
        messages: buildMessagesPayload(messages),
        max_tokens: maxTokens,
      };

      if (options?.temperature !== undefined) body.temperature = options.temperature;

      if (tools && tools.length > 0) {
        body.tools = buildToolsPayload(tools);
      }

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI provider error (${res.status}): ${text}`);
      }

      const data = await res.json();
      return parseResponse(data);
    },

    async *streamChat(messages, options) {
      const model = options?.model || config.model || 'gpt-4o';
      const maxTokens = options?.maxTokens || config.maxTokens || 4096;
      const tools = options?.tools;

      const body: Record<string, unknown> = {
        model,
        messages: buildMessagesPayload(messages),
        max_tokens: maxTokens,
        stream: true,
      };

      if (options?.temperature !== undefined) body.temperature = options.temperature;

      if (tools && tools.length > 0) {
        body.tools = buildToolsPayload(tools);
      }

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        yield { type: 'error', error: `AI provider error (${res.status}): ${text}` };
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done', finishReason: 'stop' };
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              if (!choice) continue;
              if (choice.delta?.content) {
                yield { type: 'delta', content: choice.delta.content };
              }
              if (choice.finish_reason) {
                yield { type: 'done', finishReason: choice.finish_reason };
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };

  return provider;
}
