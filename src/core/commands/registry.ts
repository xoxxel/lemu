import type { Command } from './types';

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(cmd: Command): void {
    this.commands.set(cmd.name, cmd);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  findByAlias(alias: string): Command | undefined {
    for (const cmd of this.commands.values()) {
      if (cmd.aliases.includes(alias)) return cmd;
    }
    return undefined;
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const registry = new CommandRegistry();
