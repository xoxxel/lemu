import { settingsRegistry } from './registry';

export function registerRuntimeSettings(): void {
  settingsRegistry.defineMany([
    { key: 'ai.defaultProvider', label: 'Default AI Provider', type: 'string', category: 'ai', defaultValue: 'ollama' },
    { key: 'ai.maxTokens', label: 'Max Tokens', type: 'number', category: 'ai', defaultValue: 4096 },
    { key: 'ai.maxAgentIterations', label: 'Max Agent Iterations', type: 'number', category: 'ai', defaultValue: 25 },
    { key: 'providers.openai.endpoint', label: 'OpenAI Endpoint', type: 'string', category: 'ai', defaultValue: 'https://api.openai.com/v1' },
    { key: 'providers.openai.apiKey', label: 'OpenAI API Key', type: 'string', category: 'ai', defaultValue: '' },
    { key: 'providers.openai.model', label: 'OpenAI Model', type: 'string', category: 'ai', defaultValue: 'gpt-4o' },
    { key: 'providers.anthropic.endpoint', label: 'Anthropic Endpoint', type: 'string', category: 'ai', defaultValue: 'https://api.anthropic.com/v1' },
    { key: 'providers.anthropic.apiKey', label: 'Anthropic API Key', type: 'string', category: 'ai', defaultValue: '' },
    { key: 'providers.ollama.endpoint', label: 'Ollama Endpoint', type: 'string', category: 'ai', defaultValue: 'http://localhost:11434' },
    { key: 'providers.ollama.model', label: 'Ollama Model', type: 'string', category: 'ai', defaultValue: 'qwen2.5-coder:7b' },
    { key: 'coder.temperature', label: 'Coder Temperature', type: 'number', category: 'coder', defaultValue: 0.2 },
    { key: 'coder.includeContext', label: 'Include Workspace Context', type: 'boolean', category: 'coder', defaultValue: true },
    { key: 'workspace.treeDepth', label: 'File Tree Depth', type: 'number', category: 'workspace', defaultValue: 3 },
    { key: 'workspace.recentFiles', label: 'Recent Files Count', type: 'number', category: 'workspace', defaultValue: 10 },
  ]);
}
