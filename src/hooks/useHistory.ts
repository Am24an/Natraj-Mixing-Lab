import { useStore } from 'zustand';
import { useHistoryStore } from '@/stores/editorStore';
import { useCallback } from 'react';

/**
 * React hook for undo/redo using zundo.
 */
export function useHistory() {
  const temporalStore = useHistoryStore();
  const { undo, redo, pastStates, futureStates } = useStore(temporalStore, (state) => state);

  return {
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    undoLabel: 'Undo',
    redoLabel: 'Redo',
    undoCount: pastStates.length,
    redoCount: futureStates.length,
    undo: useCallback(() => undo(), [undo]),
    redo: useCallback(() => redo(), [redo]),
  };
}
