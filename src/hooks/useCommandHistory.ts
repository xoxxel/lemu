import { useState, useCallback, useRef } from 'react';
import { commandHistory, type HistoryEntryType } from '../core/history/command-history';

export function useCommandHistory() {
  const [isNavigating, setIsNavigating] = useState(false);
  const cursorRef = useRef(-1);

  const add = useCallback((input: string) => {
    const type: HistoryEntryType = input.startsWith('/') ? 'slash-command' : 'shell-command';
    commandHistory.add(input, type);
    cursorRef.current = -1;
    setIsNavigating(false);
  }, []);

  const up = useCallback((currentInput: string): string | null => {
    const result = commandHistory.navigateUp(currentInput);
    cursorRef.current = commandHistory.getCursor();
    setIsNavigating(commandHistory.isNavigating());
    return result;
  }, []);

  const down = useCallback((): string | null => {
    const result = commandHistory.navigateDown();
    cursorRef.current = commandHistory.getCursor();
    setIsNavigating(commandHistory.isNavigating());
    return result;
  }, []);

  const reset = useCallback(() => {
    commandHistory.reset();
    cursorRef.current = -1;
    setIsNavigating(false);
  }, []);

  return { add, up, down, reset, isNavigating };
}
