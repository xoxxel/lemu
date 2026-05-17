import type { AIProvider, AIMessage, MCPTool, AIResult } from './types';
import { createProvider } from './provider';
import { defineTools } from './mcp-tools';
import { buildContextMessages, buildSystemPrompt } from './context';

const MAX_ITERATIONS = 25;

let provider: AIProvider | null = null;
let toolCache: MCPTool[] | null = null;

function getTools(): MCPTool[] {
  if (!toolCache) toolCache = defineTools();
  return toolCache;
}

function getToolByName(name: string): MCPTool | undefined {
  return getTools().find((t) => t.name === name);
}

export async function ensureProvider(config?: Record<string, string>): Promise<AIProvider> {
  if (!provider) {
    provider = await createProvider(
      config?.apiKey ? { apiKey: config.apiKey } : undefined
    );
  }
  return provider;
}

export function resetProvider(): void {
  provider = null;
}

export async function askAI(input: string): Promise<AIResult> {
  try {
    const p = await ensureProvider();
    const messages = buildContextMessages(input);
    const response = await p.chat(messages, getTools());
    return {
      success: true,
      message: response.content || '(no response)',
      data: response,
    };
  } catch (err) {
    return {
      success: false,
      message: `AI error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function runAgent(task: string): Promise<AIResult> {
  try {
    const p = await ensureProvider();
    const tools = getTools();
    const toolMap = new Map(tools.map((t) => [t.name, t]));

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt({
          taskDescription: task,
        }) + '\n\nYou must complete this task step by step using the available tools. After each tool call, analyze the result and decide what to do next. When the task is complete, provide a summary.',
      },
      { role: 'user', content: task },
    ];

    const logs: string[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await p.chat(messages, tools);

      if (response.tool_calls && response.tool_calls.length > 0) {
        messages.push(response);

        for (const call of response.tool_calls) {
          const tool = toolMap.get(call.function.name);
          if (!tool) {
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: `Unknown tool: ${call.function.name}`,
            });
            continue;
          }

          let args: Record<string, unknown>;
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            args = {};
          }

          const result = await tool.execute(args);
          const logLine = `[${call.function.name}] ${JSON.stringify(args)} -> ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`;
          logs.push(logLine);

          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          });
        }
      } else {
        return {
          success: true,
          message: response.content || 'Task completed.',
          data: { response, logs },
        };
      }
    }

    return {
      success: true,
      message: 'Task completed (max iterations reached).',
      data: { logs },
    };
  } catch (err) {
    return {
      success: false,
      message: `Agent error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export async function configureAI(config: Record<string, string>): Promise<AIResult> {
  const apiKey = config.apiKey || config.key;
  if (apiKey) {
    resetProvider();
    provider = await createProvider({ apiKey });
    return { success: true, message: 'AI provider configured.' };
  }
  return { success: false, message: 'Provide an API key: /ai config apiKey=sk-...' };
}
