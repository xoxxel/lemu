import type { Command, CommandResult, ParsedCommand } from '../commands/types';
import { registry } from '../commands/registry';

export class Executor {
  async execute(parsed: ParsedCommand): Promise<CommandResult> {
    const cmd = registry.get(parsed.name);

    if (!cmd) {
      const aliased = registry.findByAlias(parsed.name);
      if (!aliased) {
        return { success: false, message: `Unknown command: /${parsed.name}` };
      }
      return this.runCommand(aliased, parsed.args);
    }

    return this.runCommand(cmd, parsed.args);
  }

  private async runCommand(cmd: Command, args: string[]): Promise<CommandResult> {
    const validationError = cmd.validate(args);
    if (validationError) {
      return { success: false, message: validationError };
    }

    try {
      return await cmd.execute(args);
    } catch (err) {
      return {
        success: false,
        message: `Error executing /${cmd.name}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async getAutocomplete(parsed: ParsedCommand) {
    const cmd = registry.get(parsed.name) || registry.findByAlias(parsed.name);
    if (!cmd) {
      return registry.getAll().map((c) => ({
        value: `/${c.name}`,
        description: c.description,
        type: 'command' as const,
      }));
    }
    return cmd.autocomplete(parsed.args);
  }
}

export const executor = new Executor();
