import type { Command, AutocompleteItem } from '../../core/commands/types';
import type { Plugin } from '../../core/plugin-system/types';
import { getRuntime } from '../../core/runtime/instance';

function getAllPlugins(): Plugin[] {
  try {
    return getRuntime().pluginRegistry.getAll();
  } catch {
    return [];
  }
}

function formatCommandHelp(cmd: Command): string {
  const parts: string[] = [];
  parts.push(`  ${cmd.name}`);
  parts.push(`    ${cmd.description}`);
  if (cmd.usage) parts.push(`    Usage: ${cmd.usage}`);
  if (cmd.aliases && cmd.aliases.length > 0) parts.push(`    Aliases: ${cmd.aliases.join(', ')}`);
  if (cmd.examples && cmd.examples.length > 0) {
    parts.push('    Examples:');
    for (const ex of cmd.examples) {
      parts.push(`      ${ex.input}  — ${ex.description}`);
    }
  }
  if (cmd.edgeCases && cmd.edgeCases.length > 0) {
    parts.push('    Edge Cases:');
    for (const ec of cmd.edgeCases) {
      parts.push(`      • ${ec.scenario}: ${ec.input} → ${ec.expected}`);
    }
  }
  return parts.join('\n');
}

function formatPluginHelp(plugin: Plugin): string {
  const parts: string[] = [];
  parts.push(`Plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
  if (plugin.docs) {
    parts.push('');
    parts.push(`  ${plugin.docs.overview}`);
    if (plugin.docs.examples) {
      parts.push('');
      parts.push('  Examples:');
      parts.push(plugin.docs.examples);
    }
    if (plugin.docs.workflows) {
      parts.push('');
      parts.push('  Workflows:');
      parts.push(plugin.docs.workflows);
    }
    if (plugin.docs.tips) {
      parts.push('');
      parts.push('  Tips:');
      parts.push(plugin.docs.tips);
    }
    if (plugin.docs.troubleshooting) {
      parts.push('');
      parts.push('  Troubleshooting:');
      parts.push(plugin.docs.troubleshooting);
    }
    if (plugin.docs.limitations) {
      parts.push('');
      parts.push('  Limitations:');
      parts.push(plugin.docs.limitations);
    }
  }
  if (plugin.commands && plugin.commands.length > 0) {
    parts.push('');
    parts.push(`  Commands (${plugin.commands.length}):`);
    for (const cmd of plugin.commands) {
      parts.push(`    /${cmd.name}  — ${cmd.description}`);
      if (cmd.usage) parts.push(`      Usage: ${cmd.usage}`);
    }
  }
  return parts.join('\n');
}

function formatOverview(): string {
  const plugins = getAllPlugins();
  const allCommands = plugins.flatMap((p) => p.commands || []);
  const lines: string[] = [
    `Available plugins: ${plugins.length}`,
    `Available commands: ${allCommands.length}`,
    '',
    'Usage:',
    '  /help                    — Show this overview',
    '  /help <plugin>           — Show plugin documentation',
    '  /help <command>          — Show command documentation',
    '',
    'Plugins:',
  ];
  for (const p of plugins) {
    const cmdCount = (p.commands || []).length;
    lines.push(`  ${p.id} (${p.name}) — ${cmdCount} command${cmdCount !== 1 ? 's' : ''} — ${p.description || ''}`);
  }
  lines.push('');
  lines.push('Commands:');
  for (const p of plugins) {
    for (const cmd of p.commands || []) {
      const aliasStr = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
      lines.push(`  /${cmd.name}${aliasStr}  — ${cmd.description}`);
    }
  }
  return lines.join('\n');
}

function findCommand(name: string): Command | undefined {
  const plugins = getAllPlugins();
  for (const p of plugins) {
    for (const cmd of p.commands || []) {
      if (cmd.name === name || cmd.aliases.includes(name)) {
        return cmd;
      }
    }
  }
  return undefined;
}

function findPlugin(idOrName: string): Plugin | undefined {
  const plugins = getAllPlugins();
  return plugins.find(
    (p) => p.id === idOrName || p.name.toLowerCase() === idOrName.toLowerCase()
  );
}

const helpCommand: Command = {
  name: 'help',
  description: 'Show help for plugins and commands',
  aliases: ['man', '?'],
  usage: '/help [plugin|command]',
  examples: [
    { input: '/help', description: 'Show overview of all plugins and commands' },
    { input: '/help fs', description: 'Show Filesystem plugin documentation' },
    { input: '/help open', description: 'Show /open command documentation' },
    { input: '/help search', description: 'Show /search command documentation' },
  ],
  edgeCases: [
    { scenario: 'unknown topic', input: '/help xyzzy', expected: 'No documentation found for: xyzzy' },
    { scenario: 'no args', input: '/help', expected: 'Full overview of all plugins and commands' },
  ],
  async execute(args) {
    if (args.length === 0) {
      return { success: true, message: formatOverview() };
    }

    const topic = args.join(' ');

    const plugin = findPlugin(topic);
    if (plugin) {
      return { success: true, message: formatPluginHelp(plugin) };
    }

    const cmd = findCommand(topic);
    if (cmd) {
      return { success: true, message: formatCommandHelp(cmd) };
    }

    return {
      success: false,
      message: `No documentation found for: ${topic}. Try /help to see available plugins and commands.`,
    };
  },
  async autocomplete(args) {
    if (args.length === 0) {
      const plugins = getAllPlugins();
      const items: AutocompleteItem[] = [
        { value: 'help', description: 'Show this help overview', type: 'command' },
      ];
      for (const p of plugins) {
        items.push({ value: p.id, description: p.name, type: 'arg' });
        for (const cmd of p.commands || []) {
          items.push({ value: cmd.name, description: cmd.description, type: 'arg' });
        }
      }
      return items;
    }
    const prefix = args[0].toLowerCase();
    const plugins = getAllPlugins();
    const items: AutocompleteItem[] = [];
    for (const p of plugins) {
      if (p.id.startsWith(prefix) || p.name.toLowerCase().startsWith(prefix)) {
        items.push({ value: p.id, description: p.name, type: 'arg' });
      }
      for (const cmd of p.commands || []) {
        if (cmd.name.startsWith(prefix) || cmd.aliases.some((a) => a.startsWith(prefix))) {
          items.push({ value: cmd.name, description: cmd.description, type: 'arg' });
        }
      }
    }
    return items;
  },
  validate() {
    return null;
  },
};

export default helpCommand;
