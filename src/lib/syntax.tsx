type TokenType = 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'tag' | 'attr' | 'punctuation' | 'space' | 'plain';

interface Token {
  type: TokenType;
  value: string;
}

const JS_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
  'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield', 'from', 'as', 'true',
  'false', 'null', 'undefined', 'interface', 'type', 'module', 'declare',
  'namespace', 'abstract', 'private', 'protected', 'public', 'readonly',
  'enum', 'implements',
]);

const CSS_KEYWORDS = new Set([
  'import', 'media', 'keyframes', 'supports', 'include', 'mixin', 'extend',
  'if', 'else', 'for', 'each', 'while', 'return', 'function',
]);

const KEYWORDS_BY_LANG: Record<string, Set<string>> = {
  js: JS_KEYWORDS,
  ts: JS_KEYWORDS,
  jsx: JS_KEYWORDS,
  tsx: JS_KEYWORDS,
  css: CSS_KEYWORDS,
  scss: CSS_KEYWORDS,
};

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    js: 'js', jsx: 'jsx', ts: 'ts', tsx: 'tsx',
    css: 'css', scss: 'scss', html: 'html', htm: 'html',
    json: 'json', md: 'markdown', py: 'python', sh: 'sh',
    bash: 'bash', rs: 'rust', go: 'go', java: 'java',
    yml: 'yaml', yaml: 'yaml', toml: 'toml', xml: 'xml',
    svg: 'xml', graphql: 'graphql',
  };
  return map[ext] ?? '';
}

const QUOTE_RE = /^(["'`])(?:(?!\1|\\).|\\.)*\1/;
const COMMENT_LINE_RE = /^\/\/.*/;
const COMMENT_BLOCK_RE = /^\/\*[\s\S]*?\*\//;
const NUMBER_RE = /^\d+(\.\d+)?([eE][+-]?\d+)?/;
const FUNCTION_RE = /^([a-zA-Z_$][\w$]*)\s*\(/;
const TAG_OPEN_RE = /^<\/?([a-zA-Z][a-zA-Z0-9]*)/;
const ATTR_RE = /^([a-zA-Z][\w-]*)=/;

const KEYWORDS = JS_KEYWORDS;

function tokenizeLine(line: string, lang: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const kwSet = KEYWORDS_BY_LANG[lang] || KEYWORDS;

  while (i < line.length) {
    const rest = line.slice(i);

    const commentMatch = rest.match(COMMENT_LINE_RE);
    if (commentMatch) {
      tokens.push({ type: 'comment', value: commentMatch[0] });
      i += commentMatch[0].length;
      continue;
    }

    const commentBlockMatch = rest.match(COMMENT_BLOCK_RE);
    if (commentBlockMatch) {
      tokens.push({ type: 'comment', value: commentBlockMatch[0] });
      i += commentBlockMatch[0].length;
      continue;
    }

    const quoteMatch = rest.match(QUOTE_RE);
    if (quoteMatch) {
      tokens.push({ type: 'string', value: quoteMatch[0] });
      i += quoteMatch[0].length;
      continue;
    }

    const tagMatch = rest.match(TAG_OPEN_RE);
    if (tagMatch && (lang === 'html' || lang === 'jsx' || lang === 'tsx')) {
      tokens.push({ type: 'tag', value: tagMatch[0] });
      i += tagMatch[0].length;
      continue;
    }

    const attrMatch = rest.match(ATTR_RE);
    if (attrMatch && (lang === 'html' || lang === 'jsx' || lang === 'tsx')) {
      tokens.push({ type: 'attr', value: attrMatch[0] });
      i += attrMatch[0].length;
      continue;
    }

    if (rest.startsWith('</') || rest.startsWith('/>') || rest.startsWith('>') || rest.startsWith('<')) {
      const closeTag = rest.match(/^<\/?[a-zA-Z][a-zA-Z0-9]*\s*>/);
      if (closeTag && (lang === 'html' || lang === 'jsx' || lang === 'tsx')) {
        tokens.push({ type: 'tag', value: closeTag[0] });
        i += closeTag[0].length;
        continue;
      }
      tokens.push({ type: 'punctuation', value: rest[0] });
      i++;
      continue;
    }

    const funcMatch = rest.match(FUNCTION_RE);
    if (funcMatch && kwSet.has(funcMatch[1]) === false) {
      tokens.push({ type: 'function', value: funcMatch[1] });
      i += funcMatch[1].length;
      continue;
    }

    const numMatch = rest.match(NUMBER_RE);
    if (numMatch) {
      tokens.push({ type: 'number', value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    const wordMatch = rest.match(/^[a-zA-Z_$][\w$]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (kwSet.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else {
        tokens.push({ type: 'plain', value: word });
      }
      i += word.length;
      continue;
    }

    if (rest[0] === ' ' || rest[0] === '\t') {
      const wsMatch = rest.match(/^[ \t]+/);
      if (wsMatch) {
        tokens.push({ type: 'space', value: wsMatch[0] });
        i += wsMatch[0].length;
        continue;
      }
    }

    const opMatch = rest.match(/^[+\-*/%=<>!&|^~?:]+/);
    if (opMatch) {
      tokens.push({ type: 'punctuation', value: opMatch[0] });
      i += opMatch[0].length;
      continue;
    }

    tokens.push({ type: 'plain', value: rest[0] });
    i++;
  }

  return tokens;
}

export function tokenize(code: string, path: string): { lineNumber: number; tokens: Token[] }[] {
  const lang = detectLanguage(path);
  const lines = code.split('\n');
  return lines.map((line, idx) => ({
    lineNumber: idx + 1,
    tokens: tokenizeLine(line, lang),
  }));
}

export function SyntaxHighlight({ code, path, className }: { code: string; path: string; className?: string }) {
  const lines = tokenize(code, path);

  return (
    <pre className={`syntax-highlight ${className ?? ''}`}>
      {lines.map((line) => (
        <div key={line.lineNumber} className="syntax-line">
          <span className="line-number">{line.lineNumber}</span>
          <span className="line-content">
            {line.tokens.map((t, i) => (
              <span key={i} className={`token-${t.type}`}>{t.value}</span>
            ))}
          </span>
        </div>
      ))}
    </pre>
  );
}
