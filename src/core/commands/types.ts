export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface AutocompleteItem {
  value: string;
  description?: string;
  type?: 'file' | 'dir' | 'command' | 'arg';
}

export interface Command {
  name: string;
  description: string;
  aliases: string[];
  execute(args: string[]): Promise<CommandResult>;
  autocomplete(args: string[]): Promise<AutocompleteItem[]>;
  validate(args: string[]): string | null;
}

export interface ParsedCommand {
  name: string;
  args: string[];
  raw: string;
}
