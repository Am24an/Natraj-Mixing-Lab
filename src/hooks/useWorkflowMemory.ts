// useWorkflowMemory — Learns from the user's editing patterns
// Persists session data in IndexedDB preferences so the app improves over time.
//
// What it learns:
//   - Last brush size and mode used in Mask Brush (restored on next open)
//   - How often each tool is used (for future smart ordering)
//   - Last background color applied
//   - Total sessions / photos edited (for tips & feature hints)

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';

/**
 * Mounts at Workspace level.
 * Watches store changes and writes learned patterns back to preferences.
 * Preferences are auto-persisted to IndexedDB by useStorage.
 */
export function useWorkflowMemory() {
  const updateWorkflowMemory = useEditorStore((s) => s.updateWorkflowMemory);
  const workflowMemory = useEditorStore((s) => s.preferences.workflowMemory);
  const hasRestoredRef = useRef(false);

  // ─── On mount & project creation: restore brush settings from last session ──
  const projectId = useEditorStore((s) => s.project?.id);
  const restoredForProjectRef = useRef<string | null>(null);

  useEffect(() => {
    const memory = useEditorStore.getState().preferences.workflowMemory;
    if (!memory) return;

    if (!hasRestoredRef.current) {
      hasRestoredRef.current = true;
      // Bump session count on app load
      updateWorkflowMemory({ totalSessions: (memory.totalSessions ?? 0) + 1 });
    }

    // Restore last brush settings whenever a new project is loaded/created
    if (projectId && restoredForProjectRef.current !== projectId) {
      restoredForProjectRef.current = projectId;
      if (memory.lastBrushSize) {
        useEditorStore.getState().updateEraser({
          size: memory.lastBrushSize,
          mode: memory.lastBrushMode ?? 'erase',
        });
      }
    }
  }, [projectId, updateWorkflowMemory]);

  // ─── Watch eraser state changes → learn brush size/mode ─────────────────
  useEffect(() => {
    // Subscribe to eraser state changes
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const eraser = state.project?.editingState.eraser;
      const prevEraser = prevState.project?.editingState.eraser;
      if (!eraser || !prevEraser) return;

      const sizeChanged = eraser.size !== prevEraser.size;
      const modeChanged = eraser.mode !== prevEraser.mode && eraser.mode !== 'pan';

      if (sizeChanged || modeChanged) {
        updateWorkflowMemory({
          ...(sizeChanged && { lastBrushSize: eraser.size }),
          ...(modeChanged && { lastBrushMode: eraser.mode as 'erase' | 'restore' }),
        });
      }
    });

    return unsubscribe;
  }, [updateWorkflowMemory]);

  // ─── Watch tool activations → increment usage counts ────────────────────
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const tool = state.activeTool;
      const prevTool = prevState.activeTool;

      // A tool was newly activated
      if (tool && tool !== prevTool) {
        const counts = {
          ...useEditorStore.getState().preferences.workflowMemory?.toolUsageCounts,
        };
        counts[tool] = (counts[tool] ?? 0) + 1;
        updateWorkflowMemory({ toolUsageCounts: counts });
      }
    });

    return unsubscribe;
  }, [updateWorkflowMemory]);

  // ─── Watch manual brush edits → track cleanup feedback metrics ─────────
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      const activeTool = state.activeTool;
      const maskUrl = state.project?.editingState.background.maskDataUrl;
      const prevMaskUrl = prevState.project?.editingState.background.maskDataUrl;

      // If mask updated while in eraser (Mask Brush) mode, user performed manual touchup
      if (activeTool === 'eraser' && maskUrl && maskUrl !== prevMaskUrl && prevMaskUrl !== null) {
        const memory = useEditorStore.getState().preferences.workflowMemory;
        const currentStrokes = (memory?.currentSessionBrushStrokes ?? 0) + 1;
        const history = [...(memory?.bgRemovalHistory ?? [])];

        if (history.length > 0) {
          const lastIdx = history.length - 1;
          history[lastIdx] = {
            ...history[lastIdx],
            neededManualCleanup: true,
            brushStrokesAfter: (history[lastIdx].brushStrokesAfter ?? 0) + 1,
          };
        }

        updateWorkflowMemory({
          currentSessionBrushStrokes: currentStrokes,
          bgRemovalHistory: history,
        });
      }
    });

    return unsubscribe;
  }, [updateWorkflowMemory]);

  return {
    totalSessions: workflowMemory?.totalSessions ?? 0,
    mostUsedTool: getMostUsedTool(workflowMemory?.toolUsageCounts ?? {}),
  };
}

function getMostUsedTool(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
}
