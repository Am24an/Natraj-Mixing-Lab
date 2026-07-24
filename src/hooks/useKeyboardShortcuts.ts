// useKeyboardShortcuts — Global keyboard shortcuts for the editor
// Registered once at the Workspace level to avoid duplicate listeners.

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { viewportController } from '@/core/rendering/ViewportController';
import type { StoreApi } from 'zustand';
import type { TemporalState } from 'zundo';
import type { Project } from '@/types';

/**
 * All editor-wide keyboard shortcuts.
 *
 * Tool switching (requires project):
 *   C  — Crop
 *   B  — Background Removal
 *   M  — Mask Brush (eraser)
 *   K  — BG Color
 *   E  — Enhancement
 *   U  — Upscale
 *   Esc — Deselect tool
 *
 * Brush mode (when Mask Brush is active):
 *   X  — Toggle Erase / Restore
 *   [  — Decrease brush size by 10
 *   ]  — Increase brush size by 10
 *
 * Viewport:
 *   Ctrl+0  — Fit to view
 *   Ctrl+1  — 100% zoom
 *   Ctrl++  — Zoom in
 *   Ctrl+-  — Zoom out
 *
 * Edit:
 *   Ctrl+Z        — Undo
 *   Ctrl+Shift+Z  — Redo
 *   Ctrl+Y        — Redo
 *   Ctrl+S        — Save
 *   Ctrl+E        — Export
 *   P             — Toggle before/after comparison
 */
export function useKeyboardShortcuts(options: {
  onSave: () => void | Promise<void>;
  onExport: () => void;
}) {
  const { onSave, onExport } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip when typing in inputs / textareas / contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const state = useEditorStore.getState();
      const { project, activeTool, setActiveTool, updateEraser, toggleComparisonMode } = state;
      const ctrl = e.ctrlKey || e.metaKey;

      // ── Ctrl + key shortcuts ──────────────────────────────────────────
      if (ctrl) {
        switch (e.key) {
          case 's':
          case 'S':
            e.preventDefault();
            void onSave();
            return;

          case 'e':
          case 'E':
            e.preventDefault();
            onExport();
            return;

          case 'z':
          case 'Z': {
            e.preventDefault();
            const temporal = (useEditorStore as unknown as { temporal: StoreApi<TemporalState<{ project: Project | null }>> }).temporal;
            if (e.shiftKey) {
              temporal.getState().redo();
            } else {
              temporal.getState().undo();
            }
            return;
          }

          case 'y':
          case 'Y': {
            e.preventDefault();
            const temporal = (useEditorStore as unknown as { temporal: StoreApi<TemporalState<{ project: Project | null }>> }).temporal;
            temporal.getState().redo();
            return;
          }

          case '0':
            e.preventDefault();
            viewportController.fitToView();
            return;

          case '1':
            e.preventDefault();
            viewportController.setActualSize();
            return;

          case '+':
          case '=':
            e.preventDefault();
            viewportController.zoom_by(0.15);
            return;

          case '-':
            e.preventDefault();
            viewportController.zoom_by(-0.15);
            return;

          default:
            return;
        }
      }

      // ── Single-key shortcuts (no Ctrl/Meta) ───────────────────────────
      switch (e.key) {
        case 'Escape':
          setActiveTool(null);
          break;

        // Tool selection — only when a project is open
        case 'c':
        case 'C':
          if (project) setActiveTool(activeTool === 'crop' ? null : 'crop');
          break;

        case 'b':
        case 'B':
          if (project)
            setActiveTool(activeTool === 'background-removal' ? null : 'background-removal');
          break;

        case 'm':
        case 'M':
          if (project) setActiveTool(activeTool === 'eraser' ? null : 'eraser');
          break;

        case 'k':
        case 'K':
          if (project)
            setActiveTool(activeTool === 'background-color' ? null : 'background-color');
          break;

        // Enhancement (avoid conflict with Export Ctrl+E — only fire without ctrl)
        case 'n':
        case 'N':
          if (project) setActiveTool(activeTool === 'enhancement' ? null : 'enhancement');
          break;

        case 'u':
        case 'U':
          if (project) setActiveTool(activeTool === 'upscale' ? null : 'upscale');
          break;

        // Mask Brush — toggle erase / restore
        case 'x':
        case 'X':
          if (activeTool === 'eraser') {
            const current = useEditorStore.getState().project?.editingState.eraser?.mode;
            if (current === 'erase') updateEraser({ mode: 'restore' });
            else if (current === 'restore') updateEraser({ mode: 'erase' });
          }
          break;

        // Mask Brush — decrease brush size
        case '[': {
          if (activeTool === 'eraser') {
            const size = useEditorStore.getState().project?.editingState.eraser?.size ?? 20;
            updateEraser({ size: Math.max(1, size - 10) });
          }
          break;
        }

        // Mask Brush — increase brush size
        case ']': {
          if (activeTool === 'eraser') {
            const size = useEditorStore.getState().project?.editingState.eraser?.size ?? 20;
            updateEraser({ size: Math.min(200, size + 10) });
          }
          break;
        }

        // Before/after comparison toggle
        case 'p':
        case 'P':
          if (project) toggleComparisonMode();
          break;

        default:
          break;
      }
    },
    [onSave, onExport]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
