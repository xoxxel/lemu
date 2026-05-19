import type { Token, TokenType } from './types';

export class Tokenizer {
  private pos = 0;
  private input = '';

  init(input: string): void {
    this.pos = 0;
    this.input = input;
  }

  tokenize(input: string): Token[] {
    this.init(input);
    const tokens: Token[] = [];
    let t = this.next();
    while (t.type !== 'eof') {
      tokens.push(t);
      t = this.next();
    }
    tokens.push(t);
    return tokens;
  }

  private next(): Token {
    if (this.pos >= this.input.length) {
      return { type: 'eof', value: '', start: this.pos, end: this.pos };
    }

    const ch = this.input[this.pos];
    const start = this.pos;

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      while (this.pos < this.input.length && (this.input[this.pos] === ' ' || this.input[this.pos] === '\t' || this.input[this.pos] === '\n')) {
        this.pos++;
      }
      return { type: 'whitespace', value: this.input.slice(start, this.pos), start, end: this.pos };
    }

    // Pipe
    if (ch === '|') {
      this.pos++;
      return { type: 'pipe', value: '|', start, end: this.pos };
    }

    // Prefixes (must be checked in order: *> before >)
    if (ch === '*' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '>') {
      this.pos += 2;
      return { type: 'prefix', value: '*>', start, end: this.pos };
    }

    if (ch === '>') {
      this.pos++;
      return { type: 'prefix', value: '>', start, end: this.pos };
    }

    if (ch === '/') {
      this.pos++;
      return { type: 'prefix', value: '/', start, end: this.pos };
    }

    if (ch === ':') {
      this.pos++;
      return { type: 'prefix', value: ':', start, end: this.pos };
    }

    if (ch === '@') {
      this.pos++;
      return { type: 'prefix', value: '@', start, end: this.pos };
    }

    if (ch === '!') {
      this.pos++;
      return { type: 'bang', value: '!', start, end: this.pos };
    }

    if (ch === '(') {
      this.pos++;
      return { type: 'lparen', value: '(', start, end: this.pos };
    }

    if (ch === ')') {
      this.pos++;
      return { type: 'rparen', value: ')', start, end: this.pos };
    }

    // Quoted string
    if (ch === '"' || ch === "'") {
      const quote = ch;
      this.pos++;
      let val = '';
      while (this.pos < this.input.length && this.input[this.pos] !== quote) {
        if (this.input[this.pos] === '\\') {
          this.pos++;
          if (this.pos < this.input.length) {
            val += this.input[this.pos];
            this.pos++;
          }
        } else {
          val += this.input[this.pos];
          this.pos++;
        }
      }
      if (this.pos < this.input.length) this.pos++; // skip closing quote
      return { type: 'string', value: val, start, end: this.pos };
    }

    // Identifier / argument (word)
    let val = '';
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === ' ' || c === '\t' || c === '\n' || c === '|' || c === ')' || c === '(') break;
      val += c;
      this.pos++;
    }

    if (val.length > 0) {
      return { type: 'ident', value: val, start, end: this.pos };
    }

    // Fallback: single char
    this.pos++;
    return { type: 'ident', value: ch, start, end: this.pos };
  }
}

export const tokenizer = new Tokenizer();
