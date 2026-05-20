import type {
  GrammarDefinition, Namespace, Prefix, AstNode,
  CommandNode, ActionNode, HelpNode, TerminalNode,
  PipeNode, SequenceNode, LiteralNode, InlineCommandNode,
  GrammarExecuteContext, GrammarContext, ExecuteResult,
} from './types';
import { parser } from './parser';

export class GrammarRegistry {
  private definitions = new Map<string, GrammarDefinition>();
  /** Index: prefix → id[] */
  private byPrefix = new Map<Prefix, string[]>();
  /** Index: namespace → id[] */
  private byNamespace = new Map<Namespace, string[]>();

  register(def: GrammarDefinition): void {
    this.definitions.set(def.id, def);
    const prefixList = this.byPrefix.get(def.id.startsWith('*>') ? '*>' : def.id.startsWith('>') ? '>' : '/') || [];
    // Determine prefix from the definition context
    const prefix = this.inferPrefix(def);
    if (prefix) {
      const list = this.byPrefix.get(prefix) || [];
      if (!list.includes(def.id)) {
        list.push(def.id);
        this.byPrefix.set(prefix, list);
      }
    }
    const nsList = this.byNamespace.get(def.namespace) || [];
    if (!nsList.includes(def.id)) {
      nsList.push(def.id);
      this.byNamespace.set(def.namespace, nsList);
    }
  }

  private inferPrefix(def: GrammarDefinition): Prefix | null {
    // Determine prefix from namespace + context conventions
    if (def.namespace === 'runtime') return '*>';
    if (def.namespace === 'global') return '/';
    return '>';
  }

  get(id: string): GrammarDefinition | undefined {
    return this.definitions.get(id);
  }

  getByPrefix(prefix: Prefix): GrammarDefinition[] {
    const ids = this.byPrefix.get(prefix) || [];
    return ids.map(id => this.definitions.get(id)).filter(Boolean) as GrammarDefinition[];
  }

  getByNamespace(ns: Namespace): GrammarDefinition[] {
    const ids = this.byNamespace.get(ns) || [];
    return ids.map(id => this.definitions.get(id)).filter(Boolean) as GrammarDefinition[];
  }

  getAll(): GrammarDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Parse and execute input in one step */
  async execute(
    input: string,
    context: GrammarContext,
    deps: {
      addTab: (type: string, title: string, state?: Record<string, unknown>) => string;
      pin: () => void;
      unpin: () => void;
    },
  ): Promise<ExecuteResult> {
    const result = parser.parse(input);
    if (!result.node) {
      if (result.error) return { success: false, message: result.error };
      return { success: false, message: 'Empty input' };
    }
    if (result.error) return { success: false, message: result.error };

    try {
      const message = await this.executeNode(result.node, context, deps);
      return { success: true, message };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async executeNode(
    node: AstNode,
    context: GrammarContext,
    deps: { addTab: (type: string, title: string, state?: Record<string, unknown>) => string; pin: () => void; unpin: () => void },
  ): Promise<string> {
    switch (node.type) {
      case 'sequence': {
        const results: string[] = [];
        for (const child of (node as SequenceNode).children) {
          const r = await this.executeNode(child, context, deps);
          results.push(r);
        }
        return results.join('\n');
      }

      case 'pipe': {
        const pipe = node as PipeNode;
        const results: string[] = [];
        for (const child of pipe.children) {
          const r = await this.executeNode(child, context, deps);
          results.push(r);
        }
        return results.join('\n--- pipeline ---\n');
      }

      case 'command': {
        const cmd = node as CommandNode;
        const def = this.definitions.get(cmd.name);
        if (!def) return `Unknown command '${cmd.name}'.`;
        const ctx: GrammarExecuteContext = {
          node: cmd,
          context,
          addTab: deps.addTab,
          pin: deps.pin,
          unpin: deps.unpin,
        };
        return (await def.execute(ctx)) || '';
      }

      case 'action': {
        const act = node as ActionNode;
        const candidates = this.resolveAction(act);
        if (candidates.length === 0) {
          return act.global
            ? `No global action '${act.id}'. Type *> to list.`
            : `No action '${act.id}'. Type > to list.`;
        }
        const def = candidates[0];
        const ctx: GrammarExecuteContext = {
          node: act,
          context,
          addTab: deps.addTab,
          pin: deps.pin,
          unpin: deps.unpin,
        };
        return (await def.execute(ctx)) || '';
      }

      case 'help': {
        const help = node as HelpNode;
        const def = help.topic ? this.definitions.get(help.topic) : undefined;
        if (help.topic && def) {
          return [
            `${def.title}`,
            def.description ? `  ${def.description}` : '',
            def.usage ? `  Usage: ${def.usage}` : '',
            ...(def.examples || []).map(e => `  eg: ${e}`),
          ].filter(Boolean).join('\n');
        }
        if (help.topic) return `No help for '${help.topic}'.`;
        return 'Usage: @<command|plugin> — e.g. @open, @search, @git';
      }

      case 'terminal': {
        const term = node as TerminalNode;
        // Terminal commands are forwarded to the PTY shell
        return `:${term.command}`;
      }

      case 'inline-command': {
        const ic = node as InlineCommandNode;
        return `/inline ${ic.name} ${ic.args.join(' ')}`;
      }

      case 'literal': {
        const lit = node as LiteralNode;
        // Literal text is forwarded to active tab's onInput
        if (lit.text) return lit.text;
        return '';
      }

      default:
        return `Unsupported node type: ${node.type}`;
    }
  }

  private resolveAction(act: ActionNode): GrammarDefinition[] {
    const candidates: GrammarDefinition[] = [];
    for (const [id, def] of this.definitions) {
      const aliasMatch = def.aliases?.some((alias) => alias === act.id || alias === act.query);
      if (act.global && def.namespace === 'runtime') {
        if (def.id === act.id || def.id === act.query || aliasMatch) {
          candidates.push(def);
        }
      }
      if (!act.global && def.namespace === 'plugin') {
        if (def.id === act.id || def.id === act.query || aliasMatch) {
          candidates.push(def);
        }
      }
    }
    return candidates;
  }
}

export const grammarRegistry = new GrammarRegistry();
