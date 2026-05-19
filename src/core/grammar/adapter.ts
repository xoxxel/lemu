import type { AstNode, CommandNode, ActionNode, HelpNode, TerminalNode } from './types';
import type { ParsedCommand } from '../commands/types';

export interface LegacyCommandPayload extends ParsedCommand {}

export interface LegacyActionPayload {
  raw: string;
  query: string;
  global: boolean;
}

export interface LegacyHelpPayload {
  raw: string;
  topic: string;
}

export interface LegacyTerminalPayload {
  raw: string;
  command: string;
}

export type LegacyPayload =
  | LegacyCommandPayload
  | LegacyActionPayload
  | LegacyHelpPayload
  | LegacyTerminalPayload;

export function nodeToLegacyPayload(
  node: AstNode | null,
  fallbackRaw: string
): { mode: 'command' | 'action' | 'help' | 'terminal' | 'tab'; payload: LegacyPayload | null } {
  if (!node) return { mode: 'tab', payload: null };

  switch (node.type) {
    case 'command': {
      const cmd = node as CommandNode;
      return {
        mode: 'command',
        payload: { name: cmd.name, args: cmd.args, raw: cmd.raw || fallbackRaw },
      };
    }
    case 'action': {
      const act = node as ActionNode;
      return {
        mode: 'action',
        payload: { raw: act.raw, query: act.query, global: act.global },
      };
    }
    case 'help': {
      const h = node as HelpNode;
      return {
        mode: 'help',
        payload: { raw: h.raw, topic: h.topic },
      };
    }
    case 'terminal': {
      const t = node as TerminalNode;
      return {
        mode: 'terminal',
        payload: { raw: t.raw, command: t.command },
      };
    }
    case 'sequence':
    case 'pipe': {
      if (node.children && node.children.length > 0 && node.children[0].type === 'command') {
        const first = node.children[0] as CommandNode;
        return {
          mode: 'command',
          payload: { name: first.name, args: first.args, raw: node.raw || fallbackRaw },
        };
      }
      return { mode: 'tab', payload: null };
    }
    default:
      return { mode: 'tab', payload: null };
  }
}

export function commandNodeToParsedCommand(node: CommandNode | AstNode): ParsedCommand {
  if (node.type === 'command') {
    const cmd = node as CommandNode;
    return { name: cmd.name, args: cmd.args, raw: node.raw ?? '' };
  }
  if ((node.type === 'sequence' || node.type === 'pipe') && node.children && node.children.length > 0) {
    const child = node.children[0];
    if (child.type === 'command') {
      const cmd = child as CommandNode;
      return { name: cmd.name, args: cmd.args, raw: node.raw ?? '' };
    }
  }
  return { name: '', args: [], raw: node.raw ?? '' };
}
