import type { ScopeNode, ParseResult } from './types';
import {
  SCOPE_KEYWORDS, SEMANTIC_KEYWORDS,
  LINE_RANGE_PATTERN, LINE_PATTERN,
} from './grammar';

export function parseScope(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { node: null, remaining: '' };

  const firstToken = trimmed.split(/\s+/)[0];
  if (!firstToken) return { node: null, remaining: trimmed };

  const rest = trimmed.slice(firstToken.length).trimStart();

  if (firstToken === 'workspace') {
    const patternToken = rest.split(/\s+/)[0];
    if (patternToken && patternToken !== rest) {
      return { node: { type: 'workspace', pattern: patternToken }, remaining: rest.slice(patternToken.length).trimStart() };
    }
    if (patternToken) {
      return { node: { type: 'workspace', pattern: patternToken }, remaining: '' };
    }
    return { node: { type: 'workspace' }, remaining: rest };
  }

  if (firstToken in SCOPE_KEYWORDS) {
    const keyword = firstToken as keyof typeof SCOPE_KEYWORDS;
    return { node: { type: SCOPE_KEYWORDS[keyword] }, remaining: rest };
  }

  if (firstToken in SEMANTIC_KEYWORDS) {
    return { node: { type: 'semantic', kind: firstToken as import('./types').SemanticKind }, remaining: rest };
  }

  const lineRangeMatch = firstToken.match(LINE_RANGE_PATTERN);
  if (lineRangeMatch) {
    return {
      node: {
        type: 'lineRange',
        startLine: parseInt(lineRangeMatch[1], 10) - 1,
        endLine: parseInt(lineRangeMatch[2], 10),
      },
      remaining: rest,
    };
  }

  const lineMatch = firstToken.match(LINE_PATTERN);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10);
    return {
      node: {
        type: 'line',
        line: lineNum - 1,
      },
      remaining: rest,
    };
  }

  return { node: null, remaining: trimmed };
}

export function parseScopeOrThrow(input: string): { node: ScopeNode; remaining: string } {
  const result = parseScope(input);
  if (!result.node) {
    throw new Error(`Invalid scope expression: '${input}'`);
  }
  return { node: result.node, remaining: result.remaining };
}

export function parseScopeWithDefault(input: string, defaultScope: ScopeNode = { type: 'document' }): { node: ScopeNode; remaining: string } {
  const result = parseScope(input);
  return {
    node: result.node ?? defaultScope,
    remaining: result.remaining,
  };
}
