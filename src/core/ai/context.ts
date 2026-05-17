import type { AIMessage } from './types';

interface ContextOptions {
  recentMessages?: string[];
  shellHistory?: string[];
  workspaceFiles?: string[];
  taskDescription?: string;
}

export function buildSystemPrompt(opts: ContextOptions = {}): string {
  const parts: string[] = [
    'You are lemu, an AI assistant integrated into a terminal workspace environment.',
    '',
    'You have access to the user\'s development workspace and can help with:',
    '- Reading and analyzing code files',
    '- Searching code for patterns and bugs',
    '- Explaining code and architecture',
    '- Running shell commands to build, test, and debug',
    '- Suggesting fixes and improvements',
    '',
    'When analyzing code, always:',
    '- Read the relevant files first',
    '- Understand the full context before answering',
    '- Provide specific, actionable advice',
    '- Show code examples when relevant',
    '',
    'Available tools:',
    '- read_file: Read file contents',
    '- list_directory: List directory entries',
    '- search_files: Search file contents',
    '- run_command: Execute a shell command',
    '- get_workspace_info: Get workspace information',
    '- get_file_tree: Get the project file tree',
  ];

  if (opts.taskDescription) {
    parts.push('', 'Current task:', opts.taskDescription);
  }

  if (opts.workspaceFiles && opts.workspaceFiles.length > 0) {
    parts.push('', 'Workspace files available:');
    parts.push(opts.workspaceFiles.slice(0, 30).join('\n'));
  }

  if (opts.shellHistory && opts.shellHistory.length > 0) {
    parts.push('', 'Recent shell commands:');
    parts.push(opts.shellHistory.slice(0, 10).join('\n'));
  }

  return parts.join('\n');
}

export function buildContextMessages(
  userInput: string,
  opts: ContextOptions = {}
): AIMessage[] {
  return [
    { role: 'system', content: buildSystemPrompt(opts) },
    { role: 'user', content: userInput },
  ];
}
