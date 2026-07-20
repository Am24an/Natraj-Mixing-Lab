// useCanvas Hook — Manages CanvasRenderer lifecycle
// Core Editor Engine Hook

import { useEffect, useRef } from 'react';
import { CanvasRenderer } from '@/core/rendering/CanvasRenderer';
import { viewportController } from '@/core/rendering/ViewportController';
import { useEditorStore } from '@/stores/editorStore';

/**
 * Binds a CanvasRenderer to a single <canvas> + container element.
 *
 * Design decisions (post-audit):
 * - Single containerRef shared by both ResizeObserver and wheel/mouse events.
 * - ResizeObserver effect runs after renderer is mounted (sequential effects).
 * - Viewport is reset to fitToView() whenever a new project is loaded.
 * - No duplicate div wrappers; canvas fills 100% of the single container.
 */
export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);

  const project = useEditorStore((s) => s.project);
  const projectId = useEditorStore((s) => s.project?.id);
  const maskDataUrl = useEditorStore((s) => s.project?.editingState.background.maskDataUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();

    rendererRef.current = new CanvasRenderer({
      canvas,
      width: Math.max(width, 1),
      height: Math.max(height, 1),
      devicePixelRatio: window.devicePixelRatio,
    });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []); // runs exactly once

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !rendererRef.current) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        rendererRef.current.resize(width, height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []); // also runs once; rendererRef is always current via .current

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (!project?.originalImage) return;

    const img = new Image();
    img.onload = () => {
      renderer.setSourceImage(img);
    };
    img.onerror = () => {
      console.error('[useCanvas] Failed to load image for canvas rendering');
    };
    img.src = project.originalImage.dataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.originalImage?.dataUrl]);

  useEffect(() => {
    if (projectId) {
      viewportController.fitToView();
    }
  }, [projectId]);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (maskDataUrl) {
      void renderer.setMaskImage(maskDataUrl).then(() => {
        // Force a definitive re-render once the mask is fully decoded to fix flicker bug
        const currentProject = useEditorStore.getState().project;
        if (currentProject?.editingState) {
          const { zoom, panX, panY } = viewportController.getState();
          renderer.render(currentProject.editingState, { zoom, panX, panY });
        }
      });
    } else {
      renderer.clearMask();
    }
  }, [maskDataUrl]);

  return { canvasRef, containerRef, rendererRef };
}
