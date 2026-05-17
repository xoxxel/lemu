import type { MCPTool } from './types';

export function defineTools(): MCPTool[] {
  return [
    {
      name: 'read_file',
      description: 'Read the contents of a file in the workspace',
      parameters: [
        { name: 'path', type: 'string', description: 'Relative path to the file', required: true },
      ],
      async execute(args) {
        const path = args.path as string;
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return data.content;
      },
    },
    {
      name: 'list_directory',
      description: 'List files and directories in a path',
      parameters: [
        { name: 'dir', type: 'string', description: 'Directory path (relative)', required: false },
      ],
      async execute(args) {
        const dir = (args.dir as string) || '.';
        const res = await fetch(`/api/fs/list?dir=${encodeURIComponent(dir)}`);
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return data.entries.map((e: { name: string; isDir: boolean }) =>
          `${e.isDir ? '[DIR]' : '[FILE]'} ${e.name}`
        ).join('\n');
      },
    },
    {
      name: 'search_files',
      description: 'Search file contents for a pattern',
      parameters: [
        { name: 'pattern', type: 'string', description: 'Search pattern (regex)', required: true },
        { name: 'dir', type: 'string', description: 'Directory to search in', required: false },
      ],
      async execute(args) {
        const pattern = args.pattern as string;
        const dir = (args.dir as string) || '.';
        const res = await fetch(`/api/fs/search?pattern=${encodeURIComponent(pattern)}&dir=${encodeURIComponent(dir)}`);
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        if (data.results.length === 0) return 'No results found.';
        return data.results.map((r: { file: string; line: number; content: string }) =>
          `${r.file}:${r.line}  ${r.content}`
        ).join('\n');
      },
    },
    {
      name: 'run_command',
      description: 'Execute a shell command (non-interactive)',
      parameters: [
        { name: 'command', type: 'string', description: 'Shell command to run', required: true },
      ],
      async execute(args) {
        const cmd = args.command as string;
        const res = await fetch('/api/shell/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return [data.stdout, data.stderr].filter(Boolean).join('\n') || '(no output)';
      },
    },
    {
      name: 'get_workspace_info',
      description: 'Get information about the current workspace',
      parameters: [],
      async execute() {
        const res = await fetch('/api/workspace');
        const data = await res.json();
        if (!data.success) return 'Could not get workspace info.';
        return `Workspace: ${data.name}\nPath: ${data.cwd}`;
      },
    },
    {
      name: 'get_file_tree',
      description: 'Get the file tree of the workspace',
      parameters: [
        { name: 'dir', type: 'string', description: 'Directory to start from', required: false },
        { name: 'depth', type: 'number', description: 'Max depth to traverse', required: false },
      ],
      async execute(args) {
        const dir = (args.dir as string) || '.';
        const depth = (args.depth as number) || 2;
        const res = await fetch(`/api/fs/tree?dir=${encodeURIComponent(dir)}&depth=${depth}`);
        const data = await res.json();
        if (!data.success) return `Error: ${data.error}`;
        return data.tree;
      },
    },
  ];
}
