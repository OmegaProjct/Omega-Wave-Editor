import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T, limit: number = 50) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setHistoryIndex] = useState(0);

  const push = useCallback((newState: T) => {
    // If the new state is same as current, don't push
    if (JSON.stringify(newState) === JSON.stringify(history[index])) return;

    const newHistory = history.slice(0, index + 1);
    newHistory.push(newState);
    
    if (newHistory.length > limit) {
      newHistory.shift();
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    setHistory(newHistory);
  }, [history, index, limit]);

  const undo = useCallback(() => {
    if (index > 0) {
      setHistoryIndex(index - 1);
      return history[index - 1];
    }
    return null;
  }, [index, history]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setHistoryIndex(index + 1);
      return history[index + 1];
    }
    return null;
  }, [index, history]);

  return { state: history[index], push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}
