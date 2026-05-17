import type { Command, CommandResult, ParsedCommand } from '../commands/types';
import { registry } from '../commands/registry';

export class Executor {
  async execute(parsed: ParsedCommand): Promise<CommandResult> {
    console.log('[EXECUTOR] execute() called with name=%s args=%j', parsed.name, parsed.args);

    const cmd = registry.get(parsed.name);
    console.log('[EXECUTOR] registry.get(%s) => %s', parsed.name, cmd ? cmd.name : 'null');

    if (!cmd) {
      const aliased = registry.findByAlias(parsed.name);
      if (!aliased) {
        console.log('[EXECUTOR] Command NOT FOUND: %s', parsed.name);
        return { success: false, message: `Unknown command: /${parsed.name}` };
      }
      console.log('[EXECUTOR] Found via alias %s => %s', parsed.name, aliased.name);
      return this.runCommand(aliased, parsed.args);
    }

    return this.runCommand(cmd, parsed.args);
  }

  private async runCommand(cmd: Command, args: string[]): Promise<CommandResult> {
    console.log('[EXECUTOR] runCommand: %s args=%j', cmd.name, args);

    const validationError = cmd.validate(args);
    if (validationError) {
      console.log('[EXECUTOR] Validation failed for %s: %s', cmd.name, validationError);
      return { success: false, message: validationError };
    }
    console.log('[EXECUTOR] Validation passed for %s', cmd.name);

    try {
      const result = await cmd.execute(args);
      console.log('[EXECUTOR] Command %s result: success=%s message=%s', cmd.name, result.success, result.message?.slice(0, 100));
      return result;
    } catch (err) {
      console.log('[EXECUTOR] Command %s threw: %s', cmd.name, err instanceof Error ? err.message : String(err));
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
