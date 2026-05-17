import type { Command } from './types';

class CommandRegistry {
  private commands = new Map<string, Command>();

  register(cmd: Command): void {
    console.log('[REGISTRY] Registering command: %s (aliases: %j)', cmd.name, cmd.aliases);
    this.commands.set(cmd.name, cmd);
    console.log('[REGISTRY] Registry size: %d', this.commands.size);
  }

  get(name: string): Command | undefined {
    const found = this.commands.get(name);
    console.log('[REGISTRY] Lookup: %s => %s', name, found ? 'FOUND' : 'NOT FOUND');
    return found;
  }

  findByAlias(alias: string): Command | undefined {
    for (const cmd of this.commands.values()) {
      if (cmd.aliases.includes(alias)) {
        console.log('[REGISTRY] Alias lookup: %s => command: %s', alias, cmd.name);
        return cmd;
      }
    }
    console.log('[REGISTRY] Alias lookup: %s => NOT FOUND', alias);
    return undefined;
  }

  getAll(): Command[] {
    const all = Array.from(this.commands.values());
    console.log('[REGISTRY] getAll() => %d commands: %j', all.length, all.map(c => c.name));
    return all;
  }
}

export const registry = new CommandRegistry();
