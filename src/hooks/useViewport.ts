// useViewport Hook — Zoom & Pan state + event bindings
// useViewport Hook — Interactive canvas pan/zoom logic

import { useState, useEffect, useCallback, useRef } from 'react';
import { viewportController, type ViewportState } from '@/core/rendering/ViewportController';

/**
 * Subscribes to the ViewportController and provides zoom/pan
 * actions + wheel/drag event handlers to bind to the canvas container.
 */
export function useViewport() {
  const [viewport, setViewport] = useState<ViewportState>(viewportController.getState());
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const unsubscribe = viewportController.subscribe(setViewport);
    return unsubscribe;
  }, []);

  const isSpaceDown = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceDown.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') isSpaceDown.current = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const canvas = e.currentTarget as HTMLElement;
    const rect = canvas.getBoundingClientRect();
    // Focal point relative to the CENTER of the canvas
    const focalX = e.clientX - rect.left - rect.width / 2;
    const focalY = e.clientY - rect.top - rect.height / 2;

    // Normalize delta across browsers, reduced sensitivity to 0.05
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    viewportController.zoom_by(delta, focalX, focalY);
  }, []);

  // Enable panning with left click, middle click, or right click drag to move the photo
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Allow left-click (0), middle-click (1), or right-click (2) panning
    if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
    
    e.preventDefault(); 
    isPanning.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPan.current.x;
    const dy = e.clientY - lastPan.current.y;
    lastPan.current = { x: e.clientX, y: e.clientY };
    viewportController.pan(dx, dy);
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        viewportController.fitToView();
      }
      if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        viewportController.setActualSize();
      }
      if (e.key === '+' || e.key === '=') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          viewportController.zoom_by(0.1);
        }
      }
      if (e.key === '-') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          viewportController.zoom_by(-0.1);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const zoomIn = useCallback(() => viewportController.zoom_by(0.1), []);
  const zoomOut = useCallback(() => viewportController.zoom_by(-0.1), []);
  const fitToView = useCallback(() => viewportController.fitToView(), []);
  const resetZoom = useCallback(() => viewportController.setActualSize(), []);

  const zoomPercent = Math.round(viewport.zoom * 100);

  return {
    viewport,
    zoomPercent,
    zoomIn,
    zoomOut,
    fitToView,
    resetZoom,
    // Event handlers to spread onto the canvas container
    canvasEvents: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
    handleWheel,
  };
}
