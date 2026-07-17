import { useEffect, useRef, useCallback, useState } from 'react';
import type { ActiveTool, Project } from '@/types';
import { EmptyCanvas } from './EmptyCanvas';
import { useViewport } from '@/hooks/useViewport';
import { useCanvas } from '@/hooks/useCanvas';
import { ZoomControls } from './ZoomControls';
import { useEditorStore } from '@/stores/editorStore';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface EditingCanvasProps {
  project: Project | null;
  activeTool: ActiveTool;
}

export function EditingCanvas({ project, activeTool }: EditingCanvasProps) {
  return (
    <main
      aria-label="Editing canvas"
      style={{
        height: '100%',
        background: 'var(--color-canvas-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!project ? (
        <EmptyCanvas />
      ) : (
        <ImageCanvas project={project} activeTool={activeTool} />
      )}
    </main>
  );
}

// --------------------------------------------------------------------------
// ImageCanvas
// --------------------------------------------------------------------------

interface ImageCanvasProps {
  project: Project;
  activeTool: ActiveTool;
}

function ImageCanvas({ project, activeTool }: ImageCanvasProps) {
  const editingState = useEditorStore((s) => s.project?.editingState);
  const cropState = useEditorStore((s) => s.project?.editingState.crop);
  const updateCrop = useEditorStore((s) => s.updateCrop);

  const { viewport, zoomPercent, zoomIn, zoomOut, fitToView, canvasEvents, handleWheel } =
    useViewport();

  const { canvasRef, containerRef, rendererRef } = useCanvas();

  // Crop state for react-image-crop
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: cropState?.x ?? 10,
    y: cropState?.y ?? 10,
    width: cropState?.width ?? 80,
    height: cropState?.height ?? 80,
  });

  // Sync aspect / preset changes from the panel into the crop UI
  useEffect(() => {
    if (!cropState) return;
    setCrop((prev) => ({
      ...prev,
      x: cropState.x,
      y: cropState.y,
      width: cropState.width,
      height: cropState.height,
    }));
  }, [cropState?.preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCropChange = useCallback((_pixelCrop: Crop, percentCrop: Crop) => {
    setCrop(percentCrop);
  }, []);

  const handleCropComplete = useCallback((_pixelCrop: Crop, percentCrop: Crop) => {
    if (percentCrop.width && percentCrop.height) {
      updateCrop({ x: percentCrop.x, y: percentCrop.y, width: percentCrop.width, height: percentCrop.height });
    }
  }, [updateCrop]);

  // Attach non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, containerRef]);

  // Re-render canvas whenever editing state or viewport changes
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || !editingState) return;
    renderer.render(editingState, {
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
    });
  }, [editingState, viewport, rendererRef]);

  const isCropping = activeTool === 'crop';

  // Calculate where the image is drawn on the canvas so we can position
  // the ReactCrop overlay exactly on top of it
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Compute image display bounds for accurate overlay alignment
  const getImageBounds = () => {
    const container = containerRef.current;
    if (!container || !project.originalImage) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = project.originalImage?.dimensions.width ?? 1;
    const ih = project.originalImage?.dimensions.height ?? 1;
    const scaleW = cw / iw;
    const scaleH = ch / ih;
    const fitScale = Math.min(scaleW, scaleH) * viewport.zoom;
    const drawW = iw * fitScale;
    const drawH = ih * fitScale;
    const drawX = (cw - drawW) / 2 + viewport.panX;
    const drawY = (ch - drawH) / 2 + viewport.panY;
    return { drawX, drawY, drawW, drawH };
  };

  const imgBounds = isCropping ? getImageBounds() : null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: isCropping ? 'crosshair' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        if (isCropping) return;
        if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing';
        canvasEvents.onMouseDown(e);
      }}
      onMouseUp={(e) => {
        if (isCropping) return;
        if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
        canvasEvents.onMouseUp();
      }}
      onMouseLeave={(e) => {
        if (isCropping) return;
        if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
        canvasEvents.onMouseLeave();
      }}
      onMouseMove={isCropping ? undefined : canvasEvents.onMouseMove}
    >
      {/* Base canvas — always rendered */}
      <canvas
        ref={canvasRef}
        aria-label={`Photo editor canvas — ${project.name}`}
        style={{
          display: 'block',
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Crop overlay — rendered exactly over the image using absolute positioning */}
      {isCropping && imgBounds && (
        <div
          style={{
            position: 'absolute',
            left: imgBounds.drawX,
            top: imgBounds.drawY,
            width: imgBounds.drawW,
            height: imgBounds.drawH,
            pointerEvents: 'auto',
          }}
        >
          <ReactCrop
            crop={crop}
            onChange={handleCropChange}
            onComplete={handleCropComplete}
            aspect={cropState?.aspect}
            minWidth={5}
            minHeight={5}
            ruleOfThirds
            style={{ width: '100%', height: '100%' }}
          >
            {/* The actual image — ReactCrop needs a real image child to render correctly */}
            <img
              ref={imgRef}
              src={project.originalImage?.dataUrl ?? ''}
              alt="crop source"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </ReactCrop>
        </div>
      )}

      <ZoomControls
        zoomPercent={zoomPercent}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitToView}
      />
    </div>
  );
}
