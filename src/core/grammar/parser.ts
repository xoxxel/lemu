import { tokenizer } from './tokenizer';
import type {
  Token, AstNode, ParseResult,
  CommandNode, ActionNode, HelpNode, TerminalNode,
  PipeNode, SequenceNode, LiteralNode, ExpressionNode,
  InlineCommandNode,
} from './types';

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): ParseResult {
    this.tokens = tokenizer.tokenize(input);
    this.pos = 0;

    const trimmed = input.trim();
    if (!trimmed) return { node: null };

    try {
      const node = this.parseSequence();
      return { node };
    } catch (e) {
      return { node: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  private current(): Token | undefined {
    return this.tokens[this.pos];
  }

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private skipWhitespace(): void {
    while (this.current()?.type === 'whitespace') {
      this.pos++;
    }
  }

  private expect(type: string, value?: string): Token {
    const t = this.current();
    if (!t) throw new Error(`Unexpected end of input, expected ${type}`);
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type} ('${t.value}')`);
    if (value !== undefined && t.value !== value) throw new Error(`Expected '${value}', got '${t.value}'`);
    this.pos++;
    return t;
  }

  // sequence = node (pipe node)*
  private parseSequence(): AstNode {
    const nodes: AstNode[] = [];
    nodes.push(this.parseNode());

    this.skipWhitespace();

    while (this.current()?.type === 'pipe') {
      this.pos++; // consume pipe
      this.skipWhitespace();
      const right = this.parseNode();
      // Merge last node and right into a PipeNode
      const left = nodes.pop()!;
      nodes.push(this.makePipe(left, right));
      this.skipWhitespace();
    }

    if (nodes.length === 1) return nodes[0];

    return {
      type: 'sequence',
      raw: nodes.map(n => n.raw).join(' | '),
      start: nodes[0].start,
      end: nodes[nodes.length - 1].end,
      children: nodes,
    };
  }

  private makePipe(left: AstNode, right: AstNode): PipeNode {
    return {
      type: 'pipe',
      raw: `${left.raw} | ${right.raw}`,
      start: left.start,
      end: right.end,
      children: [left as CommandNode, right],
    };
  }

  private parseNode(): AstNode {
    this.skipWhitespace();
    const t = this.current();
    if (!t) {
      return {
        type: 'literal',
        raw: '',
        start: this.pos,
        end: this.pos,
        text: '',
      } as LiteralNode;
    }

    if (t.type === 'prefix') {
      return this.parsePrefixedNode();
    }

    // Literal / plain text (tab mode input)
    return this.parseLiteral();
  }

  private parsePrefixedNode(): AstNode {
    const prefix = this.expect('prefix');
    this.skipWhitespace();

    switch (prefix.value) {
      case '/': return this.parseCommand();
      case '>': return this.parseAction(false);
      case '*>': return this.parseAction(true);
      case ':': return this.parseTerminal();
      case '@': return this.parseHelp();
      default: {
        const rest = this.collectRest();
        return {
          type: 'literal',
          raw: prefix.value + (rest ? ' ' + rest : ''),
          start: prefix.start,
          end: this.pos,
          text: prefix.value + (rest ? ' ' + rest : ''),
        } as LiteralNode;
      }
    }
  }

  private parseCommand(): CommandNode {
    const start = this.pos;
    const rawStart = this.tokens[start - 1]?.start ?? start;

    const nameToken = this.current();
    const name = nameToken?.value ?? '';
    if (nameToken) this.pos++;

    const args: string[] = [];
    this.skipWhitespace();
    while (this.current() && this.current()!.type !== 'pipe' && this.current()!.type !== 'eof') {
      if (this.current()!.type === 'whitespace') {
        this.pos++;
        continue;
      }
      if (this.current()!.type === 'string') {
        args.push(this.current()!.value);
        this.pos++;
      } else if (this.current()!.type === 'ident') {
        args.push(this.current()!.value);
        this.pos++;
      } else {
        break;
      }
    }

    const end = this.pos > 0 ? this.tokens[this.pos - 1]?.end ?? rawStart : rawStart;
    const raw = this.tokens.slice(
      this.tokens.findIndex(t => t.start >= rawStart),
      this.pos
    );
    const rawStr = raw.map(t => t.value).join('').trim();

    return {
      type: 'command',
      raw: rawStr || '/' + name + (args.length > 0 ? ' ' + args.join(' ') : ''),
      name,
      args,
      start: rawStart,
      end,
    };
  }

  private parseAction(global: boolean): ActionNode {
    const start = this.pos;
    const rawStart = this.tokens.slice(0, this.pos).reverse().find(t => t.type === 'prefix')?.start ?? start;

    const idToken = this.current();
    const id = idToken?.value ?? '';
    if (idToken) this.pos++;

    const args: string[] = [];
    this.skipWhitespace();
    while (this.current() && this.current()!.type !== 'pipe' && this.current()!.type !== 'eof') {
      if (this.current()!.type === 'whitespace') {
        this.pos++;
        continue;
      }
      if (this.current()!.type === 'string') {
        args.push(this.current()!.value);
        this.pos++;
      } else if (this.current()!.type === 'ident') {
        args.push(this.current()!.value);
        this.pos++;
      } else {
        break;
      }
    }

    const query = [id, ...args].join(' ').trim();
    const end = this.pos > 0 ? this.tokens[Math.min(this.pos - 1, this.tokens.length - 1)]?.end ?? rawStart : rawStart;
    const rawStr = (global ? '*>' : '>') + query;

    return {
      type: 'action',
      raw: rawStr,
      id,
      global,
      query,
      start: rawStart,
      end,
    };
  }

  private parseTerminal(): TerminalNode {
    const start = this.pos;
    const rawStart = this.tokens.slice(0, this.pos).reverse().find(t => t.type === 'prefix')?.start ?? start;

    const rest = this.collectRest();
    return {
      type: 'terminal',
      raw: ':' + rest,
      command: rest,
      start: rawStart,
      end: this.pos,
    };
  }

  private parseHelp(): HelpNode {
    const start = this.pos;
    const rawStart = this.tokens.slice(0, this.pos).reverse().find(t => t.type === 'prefix')?.start ?? start;

    const topic = this.current()?.value ?? '';
    if (this.current()) this.pos++;

    return {
      type: 'help',
      raw: '@' + topic,
      topic,
      start: rawStart,
      end: this.pos,
    };
  }

  private parseLiteral(): LiteralNode {
    const start = this.pos;
    let text = '';

    while (this.current() && this.current()!.type !== 'pipe' && this.current()!.type !== 'eof') {
      if (this.current()!.type === 'whitespace') {
        text += this.current()!.value;
        this.pos++;
        continue;
      }
      if (this.current()!.type === 'ident' || this.current()!.type === 'string') {
        text += this.current()!.value;
        this.pos++;
        continue;
      }
      if (this.current()?.type === 'prefix') {
        // Inline command detection: /command inside text
        const savedPos = this.pos;
        const prefix = this.current()!;

        if (prefix.value === '/') {
          this.pos++;
          this.skipWhitespace();
          const cmdName = this.current()?.value;
          if (cmdName) {
            this.pos++;
            const cmdArgs: string[] = [];
            this.skipWhitespace();
            while (this.current() && this.current()!.type !== 'whitespace' && this.current()!.type !== 'pipe' && this.current()!.type !== 'eof') {
              if (this.current()!.type === 'ident' || this.current()!.type === 'string') {
                cmdArgs.push(this.current()!.value);
                this.pos++;
              } else break;
            }
            const node: InlineCommandNode = {
              type: 'inline-command',
              raw: '/' + cmdName + (cmdArgs.length > 0 ? ' ' + cmdArgs.join(' ') : ''),
              name: cmdName,
              args: cmdArgs,
              start: prefix.start,
              end: this.pos,
              children: [],
            };
            return node as unknown as LiteralNode;
          }
        }

        // Not a recognizable inline command — treat as literal
        this.pos = savedPos;
        text += prefix.value;
        this.pos++;
        continue;
      }
      break;
    }

    return {
      type: 'literal',
      raw: text.trim(),
      text: text.trim(),
      start,
      end: this.pos,
    };
  }

  private collectRest(): string {
    let result = '';
    while (this.current() && this.current()!.type !== 'pipe' && this.current()!.type !== 'eof') {
      result += this.current()!.value;
      this.pos++;
    }
    return result.trim();
  }
}

export const parser = new Parser();
