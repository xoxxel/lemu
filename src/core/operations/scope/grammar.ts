/**
 * Formal Scope Grammar
 *
 * A scope expression is a separate parseable language unit.
 * It is NOT a command, NOT an action, NOT an operation.
 *
 * ── BNF Grammar ────────────────────────────────────────────────────────────
 *
 *   scope          = document-scope
 *                  | selection-scope
 *                  | line-scope
 *                  | line-range-scope
 *                  | semantic-scope
 *                  | workspace-scope
 *
 *   document-scope   = "document"
 *   selection-scope  = "selection"
 *   line-scope       = integer
 *   line-range-scope = integer ":" integer
 *   semantic-scope   = "comments" | "strings" | "functions"
 *                    | "imports" | "types" | "exports"
 *   workspace-scope  = "workspace" [ ":" glob-pattern ]
 *                    | glob-pattern     (if contains * / ** / ?)
 *
 *   integer          = digit { digit }
 *   digit            = "0" | "1" | ... | "9"
 *   glob-pattern     = { any-char }
 *
 * ── Precedence ─────────────────────────────────────────────────────────────
 *
 * 1. If the first token matches a known scope keyword → parse as that scope.
 * 2. If the first token matches \d+(:\d+)? → parse as line / line-range scope.
 * 3. If the first token contains * / ** / ? → parse as workspace / glob scope.
 * 4. Otherwise → no scope expression; caller falls back to default scope.
 *
 * ── Scope Categories ───────────────────────────────────────────────────────
 *
 *   document   — "document"
 *   positional — "selection", <line>, <line>:<line>
 *   semantic   — "comments", "strings", "functions", "imports", "types", "exports"
 *   workspace  — "workspace", <glob>
 *
 * ── Grammar Constants ──────────────────────────────────────────────────────
 *
 * These are the canonical keyword values.  All case-sensitive.
 */

export const SCOPE_KEYWORDS: Record<string, 'document' | 'selection'> = {
  document: 'document',
  selection: 'selection',
};

export const SEMANTIC_KEYWORDS: Record<string, string> = {
  comments: 'comments',
  strings: 'strings',
  functions: 'functions',
  imports: 'imports',
  types: 'types',
  exports: 'exports',
};

export const ALL_SCOPE_KEYWORDS = new Set([
  ...Object.keys(SCOPE_KEYWORDS),
  ...Object.keys(SEMANTIC_KEYWORDS),
  'workspace',
]);

export const LINE_RANGE_PATTERN = /^(\d+):(\d+)$/;
export const LINE_PATTERN = /^(\d+)$/;
export const GLOB_PATTERN = /^[^*?]*[*?]+/;

export function isScopeToken(token: string): boolean {
  if (ALL_SCOPE_KEYWORDS.has(token)) return true;
  if (LINE_RANGE_PATTERN.test(token)) return true;
  if (LINE_PATTERN.test(token)) return true;
  if (GLOB_PATTERN.test(token)) return true;
  return false;
}
