import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 100;

export function useCommandHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const savedInput = useRef('');

  const add = useCallback((input: string) => {
    setHistory((prev) => {
      const next = [input, ...prev].slice(0, MAX_HISTORY);
      return next;
    });
    setCursor(-1);
  }, []);

  const up = useCallback((currentInput: string) => {
    setCursor((prev) => {
      const next = prev === -1 ? 0 : Math.min(prev + 1, history.length - 1);
      if (prev === -1) savedInput.current = currentInput;
      return next;
    });
    if (cursor === -1 && history.length > 0) return history[0];
    if (cursor >= 0 && cursor < history.length - 1) return history[cursor + 1];
    return cursor >= 0 && cursor < history.length ? history[cursor] : currentInput;
  }, [history, cursor]);

  const down = useCallback((currentInput: string) => {
    setCursor((prev) => {
      if (prev <= 0) {
        return -1;
      }
      return prev - 1;
    });
    if (cursor <= 0) return savedInput.current;
    return history[cursor - 1] ?? savedInput.current;
  }, [history, cursor]);

  const resetCursor = useCallback(() => {
    setCursor(-1);
    savedInput.current = '';
  }, []);

  return { history, add, up, down, cursor, resetCursor };
}
