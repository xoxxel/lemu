export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface AutocompleteItem {
  value: string;
  description?: string;
  type?: 'file' | 'dir' | 'command' | 'arg' | 'help' | 'action';
}

export interface CommandExample {
  input: string;
  description: string;
  output?: string;
}

export interface CommandEdgeCase {
  scenario: string;
  input: string;
  expected: string;
}

export interface Command {
  name: string;
  description: string;
  aliases: string[];
  execute(args: string[]): Promise<CommandResult>;
  autocomplete(args: string[]): Promise<AutocompleteItem[]>;
  validate(args: string[]): string | null;
  usage?: string;
  examples?: CommandExample[];
  edgeCases?: CommandEdgeCase[];
}

export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}
