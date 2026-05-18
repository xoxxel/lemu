import React, { useEffect, useRef, useState } from 'react';

interface CalcStep {
  expr: string;
  result: number;
  label: string;
}

interface CalcState {
  expression?: string;
  steps?: CalcStep[];
  final?: number;
  formatted?: string;
}

interface HistoryEntry {
  expression: string;
  formatted: string;
  steps: CalcStep[];
  final: number;
  timestamp: Date;
}

// ─── Operators breakdown ──────────────────────────────────────────────────────

function tokenize(expr: string): { text: string; type: 'num' | 'op' | 'fn' | 'paren' }[] {
  const tokens: { text: string; type: 'num' | 'op' | 'fn' | 'paren' }[] = [];
  const re = /(\d+\.?\d*|\.\d+|[+\-*/^×÷]|\*\*|[()πe]|Math\.\w+|\b(?:sqrt|abs|log|ln|sin|cos|tan|floor|ceil|round)\b)/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    const t = m[1];
    if (/^\d|^\./.test(t) || t === 'π' || t === 'e') tokens.push({ text: t, type: 'num' });
    else if (/[+\-*/^×÷]|^\*\*$/.test(t)) tokens.push({ text: t, type: 'op' });
    else if (/[()]/.test(t)) tokens.push({ text: t, type: 'paren' });
    else tokens.push({ text: t, type: 'fn' });
  }
  return tokens;
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e15 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(4);
  if (Number.isInteger(n)) return n.toLocaleString();
  return parseFloat(n.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

// ─── CalculatorView ───────────────────────────────────────────────────────────

export function CalculatorView({ state }: { state: Record<string, unknown> }) {
  const s = state as CalcState;
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [animated, setAnimated] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Every time new state comes in, append to history
  useEffect(() => {
    if (!s.expression || s.final === undefined) return;
    setAnimated(false);
    setTimeout(() => setAnimated(true), 50);
    setHistory(prev => {
      // Avoid duplicates
      if (prev.length && prev[prev.length - 1].expression === s.expression) return prev;
      return [
        ...prev,
        {
          expression: s.expression!,
          formatted: s.formatted || String(s.final),
          steps: s.steps || [],
          final: s.final!,
          timestamp: new Date(),
        },
      ];
    });
  }, [s.expression, s.final]);

  const current = history[history.length - 1];

  if (!current) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: '16px',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)',
      }}>
        <span style={{ fontSize: 48 }}>⊞</span>
        <p style={{ fontSize: 15, margin: 0 }}>Type <code style={{
          background: 'var(--color-background-secondary)',
          padding: '2px 8px',
          borderRadius: 4,
          fontFamily: 'var(--font-mono)',
        }}>/calc &lt;expression&gt;</code> to compute</p>
      </div>
    );
  }

  const tokens = tokenize(current.expression);

  return (
    <div style={{
      padding: '32px 40px 48px',
      maxWidth: 760,
      margin: '0 auto',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* ── Big result display ────────────────────────────────────── */}
      <div style={{
        background: 'var(--color-background-secondary)',
        borderRadius: 'var(--border-radius-lg)',
        border: '0.5px solid var(--color-border-tertiary)',
        padding: '32px 40px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Expression tokens */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'baseline',
          marginBottom: 20,
        }}>
          {tokens.map((tok, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 18,
              fontWeight: tok.type === 'op' ? 400 : 500,
              color: tok.type === 'op' ? 'var(--color-text-secondary)'
                : tok.type === 'fn' ? '#185FA5'
                : tok.type === 'paren' ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
              letterSpacing: tok.type === 'op' ? '0.05em' : 0,
            }}>
              {tok.text}
            </span>
          ))}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 18,
            color: 'var(--color-text-tertiary)',
            marginLeft: 4,
          }}>=</span>
        </div>

        {/* Big number */}
        <div ref={resultRef} style={{
          fontFamily: 'var(--font-mono)',
          fontSize: current.formatted.length > 16 ? 36 : current.formatted.length > 10 ? 48 : 64,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          opacity: animated ? 1 : 0,
          transform: animated ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
          {current.formatted}
        </div>

        {/* Timestamp */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 20,
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {current.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {/* ── Computation breakdown ─────────────────────────────────── */}
      {current.steps.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-tertiary)',
            margin: '0 0 16px',
          }}>Computation steps</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {current.steps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateX(0)' : 'translateX(-8px)',
                transition: `opacity 0.3s ease ${0.1 + i * 0.07}s, transform 0.3s ease ${0.1 + i * 0.07}s`,
              }}>
                {/* Timeline dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#185FA5',
                    flexShrink: 0,
                  }} />
                  {i < current.steps.length - 1 && (
                    <div style={{ width: 1.5, flex: 1, minHeight: 28, background: 'var(--color-border-tertiary)' }} />
                  )}
                </div>

                {/* Step content */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flex: 1,
                  padding: '8px 0 8px 12px',
                  borderBottom: i < current.steps.length - 1 ? 'none' : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: 'var(--color-text-secondary)',
                  }}>
                    {step.expr}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-background-secondary)',
                    padding: '2px 10px',
                    borderRadius: 6,
                    border: '0.5px solid var(--color-border-tertiary)',
                  }}>
                    {formatNumber(step.result)}
                  </span>
                </div>
              </div>
            ))}

            {/* Final result connector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#0F6E56',
                  border: '2px solid var(--color-background-primary)',
                  boxSizing: 'border-box',
                }} />
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flex: 1,
                padding: '8px 0 8px 12px',
              }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>result</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--color-text-success)',
                  background: 'var(--color-background-success)',
                  padding: '2px 10px',
                  borderRadius: 6,
                }}>
                  {current.formatted}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── History timeline ──────────────────────────────────────── */}
      {history.length > 1 && (
        <div>
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-text-tertiary)',
            margin: '0 0 16px',
          }}>History</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...history].reverse().slice(1).map((entry, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'var(--color-background-secondary)',
                borderRadius: 'var(--border-radius-md)',
                border: '0.5px solid var(--color-border-tertiary)',
                opacity: 0.75,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: 56 }}>
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {entry.expression}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  {entry.formatted}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}