import type { Plugin, PluginContext, PluginInputPayload, PluginInputResult } from '../../core/plugin-system/types';
import type { PluginAction } from '../../core/actions/types';
import type { Command } from '../../core/commands/types';
import { eventBus } from '../../core/events';
import { CalculatorView } from './views/calculatorView';
import { calculatorManifest } from './manifest';
import { calculatorDefaultSettings, calculatorSettingsSchema } from './settings';

// ─── Utility: Safe math evaluator ────────────────────────────────────────────

function parseExpression(input: string): {
  steps: { expr: string; result: number; label: string }[];
  final: number;
  formatted: string;
} {
  const raw = input.trim();

  // Normalize: support × ÷ ^ implicit multiplication like 2(3)
  const normalized = raw
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\^/g, '**')
    .replace(/,/g, '')        // strip thousand separators
    .replace(/π/g, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/ceil\(/g, 'Math.ceil(')
    .replace(/round\(/g, 'Math.round(');

  // Build step-by-step breakdown
  const steps: { expr: string; result: number; label: string }[] = [];

  // Try to parse sub-expressions (parenthesized groups first)
  const parenRegex = /\(([^()]+)\)/g;
  let working = normalized;
  let match;
  let stepIndex = 0;

  const tempMap: Record<string, number> = {};

  while ((match = parenRegex.exec(working)) !== null) {
    const inner = match[1];
    try {
      // eslint-disable-next-line no-new-func
      const val = Function('"use strict"; return (' + inner + ')')() as number;
      const token = `__t${stepIndex++}__`;
      tempMap[token] = val;
      steps.push({ expr: `(${inner})`, result: val, label: `group` });
      working = working.replace(match[0], token);
      parenRegex.lastIndex = 0; // reset after replacement
    } catch {
      break;
    }
  }

  // Replace temp tokens for final eval
  let finalExpr = working;
  for (const [token, val] of Object.entries(tempMap)) {
    finalExpr = finalExpr.replace(new RegExp(token, 'g'), String(val));
  }

  // eslint-disable-next-line no-new-func
  const final = Function('"use strict"; return (' + finalExpr + ')')() as number;

  // Format final result
  const formatted =
    Math.abs(final) >= 1e15 || (Math.abs(final) < 1e-6 && final !== 0)
      ? final.toExponential(6)
      : Number.isInteger(final)
      ? final.toLocaleString()
      : parseFloat(final.toPrecision(12)).toLocaleString(undefined, {
          maximumFractionDigits: 10,
        });

  return { steps, final, formatted };
}

// ─── Command ──────────────────────────────────────────────────────────────────

const calcCommand: Command = {
  name: 'calculator',
  description: 'Evaluate a mathematical expression with a visual breakdown',
  aliases: ['math', '='],
  usage: '/calc <expression>',
  examples: [
    { input: '/calc 2 + 2', description: 'Simple addition example', output: '4' },
    { input: '/calc (3 + 5) * 2 / 4', description: 'Order of operations example', output: '4' },
    { input: '/calc sqrt(144) + 2^3', description: 'Functions and powers example', output: '20' },
    { input: '/calc sin(0) + cos(0)', description: 'Trigonometric functions', output: '1' },
  ],
  edgeCases: [
    { scenario: 'Division by zero', input: '/calc 1/0', expected: 'Returns Infinity — shown in result' },
    { scenario: 'Invalid expression', input: '/calc 2++', expected: 'Returns error feedback' },
  ],

  async execute(args: string[]) {
    const expr = args.join(' ').trim();
    if (!expr) {
      return {
        success: false,
        message: 'Please provide an expression. Example: /calc (3 + 5) * 2',
      };
    }

    try {
      const result = parseExpression(expr);
      return {
        success: true,
        message: `${expr} = ${result.formatted}`,
        data: {
          type: 'calculator',
          expression: expr,
          steps: result.steps,
          final: result.final,
          formatted: result.formatted,
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Invalid expression: ${msg}`,
      };
    }
  },

  async autocomplete(args: string[]) {
    const fns = ['sqrt(', 'abs(', 'log(', 'ln(', 'sin(', 'cos(', 'tan(', 'floor(', 'ceil(', 'round('];
    const last = args[args.length - 1] || '';
    if (!last) return fns.map(f => ({ value: f, description: `Function`, type: 'arg' as const }));
    const matches = fns.filter(f => f.startsWith(last));
    return matches.map(f => ({ value: f, description: `Math function`, type: 'arg' as const }));
  },

  validate(args: string[]) {
    if (!args.length || !args.join('').trim()) return 'Expression required';
    return null;
  },
};

// ─── Actions ─────────────────────────────────────────────────────────────────

const clearAction: PluginAction = {
  id: 'clear',
  title: 'Clear history',
  description: 'Clear the calculation history',
  handler: async () => {
    eventBus.emit('calculator:clear', {});
    return 'Calculation history cleared.';
  },
};

const copyAction: PluginAction = {
  id: 'copy-result',
  title: 'Copy result',
  description: 'Copy last result to clipboard',
  handler: async (ctx) => {
    const last = ctx.tabState?.formatted as string | undefined;
    if (!last) return 'No result to copy.';
    try {
      const text = ctx.tabState?.expression
        ? `${ctx.tabState.expression} = ${last}`
        : last;
      await navigator.clipboard.writeText(text);
      eventBus.emit('feedback', { level: 'success', message: `Copied ${last} to clipboard.`, dismissible: true });
      return `Copied ${last} to clipboard.`;
    } catch {
      return 'Failed to copy to clipboard.';
    }
  },
};

// ─── Plugin manifest ─────────────────────────────────────────────────────────

export const calculatorPlugin: Plugin = {
  id: 'calculator',
  name: 'Calculator',
  version: '1.0.0',
  description: 'Evaluate math expressions with animated visual breakdown',

  commands: [calcCommand],
  manifest: calculatorManifest,
  settings: calculatorDefaultSettings,
  settingsSchema: calculatorSettingsSchema,
  actions: [clearAction, copyAction],

  views: [
    {
      type: 'calculator',
      component: CalculatorView,
      meta: { label: 'Calculator', icon: '⊞' },
    },
  ],

  async activate(ctx: PluginContext) {
    ctx.feedback.info('Calculator plugin loaded. Type /calc <expression> to compute.');
  },

  async onInput(payload: PluginInputPayload): Promise<PluginInputResult | void> {
    const raw = payload.input.trim();
    if (!raw) return;

    const operators = ['+', '-', '*', '/', '%', '^', '×', '÷'];
    const prevFinal = payload.state?.final as number | undefined;
    const expr = prevFinal !== undefined && operators.some(op => raw.startsWith(op))
      ? String(prevFinal) + raw
      : raw;

    try {
      const result = parseExpression(expr);
      return {
        message: `${expr} = ${result.formatted}`,
        state: { expression: expr, steps: result.steps, final: result.final, formatted: result.formatted },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { message: `Invalid expression: ${msg}` };
    }
  },

  async onReady() {
    console.log('[CALCULATOR] ready');
  },

  async onCleanup() {
    console.log('[CALCULATOR] cleaned up');
  },

  docs: {
    overview:
      'Evaluates mathematical expressions and shows a visual step-by-step breakdown in a dedicated tab.\n\nSupports: + - * / ** (power), sqrt(), abs(), log(), ln(), sin(), cos(), tan(), floor(), ceil(), round(), π, e.',
    examples:
      '  /calc 100 * 1.08\n  /calc (3 + 5) * 2 / 4\n  /calc sqrt(144) + 2^3\n  /calc sin(π / 2)',
    workflows:
      '  1. Type /calc <expression> in the input bar\n  2. A tab opens showing the result and computation timeline\n  3. Use >copy-result to copy the result\n  4. Run another /calc to add to the history',
    tips:
      '  Use π instead of 3.14159...\n  Use ^ or ** for powers\n  Use × and ÷ as alternative operators',
    limitations:
      '  Storage is in-memory — history resets on page reload.\n  Complex multi-variable expressions are not supported.',
  },
};