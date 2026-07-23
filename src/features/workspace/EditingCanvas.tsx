import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
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

// ImageCanvas

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

  const isCropping = activeTool === 'crop';
  const isErasing = activeTool === 'eraser';

  // Crop state for react-image-crop
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: cropState?.x ?? 10,
    y: cropState?.y ?? 10,
    width: cropState?.width ?? 80,
    height: cropState?.height ?? 80,
  });

  // Eraser drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const eraserState = useEditorStore((s) => s.project?.editingState.eraser);
  const setBackgroundRemoved = useEditorStore((s) => s.setBackgroundRemoved);

  // Space+Drag panning while in eraser mode
  const isSpaceDown = useRef(false);
  const [isPanningInEraser, setIsPanningInEraser] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isErasing) {
        e.preventDefault();
        isSpaceDown.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceDown.current = false;
        setIsPanningInEraser(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isErasing]);

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

  // Brush preview state
  const [showPreviewCircle, setShowPreviewCircle] = useState(false);
  const eraserSize = eraserState?.size;
  const prevSize = useRef(eraserSize);

  useEffect(() => {
    if (!isErasing || !eraserSize || isDrawing) return;
    
    // Trigger preview overlay if size changes
    if (prevSize.current !== eraserSize) {
      prevSize.current = eraserSize;
      setShowPreviewCircle(true);
      const timeout = setTimeout(() => setShowPreviewCircle(false), 800);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [eraserSize, isErasing, isDrawing]);

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

  // Compute image bounds for crop overlay AND eraser hover detection
  const imgBounds = (isCropping || isErasing) ? getImageBounds() : null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCropping) return;
    if (isErasing) {
      // Middle-click (1), Right-click (2), Spacebar, or Pan mode -> start panning photo
      if (e.button === 1 || e.button === 2 || isSpaceDown.current || eraserState?.mode === 'pan') {
        setIsPanningInEraser(true);
        canvasEvents.onMouseDown(e);
        return;
      }
      if (e.button !== 0) return; // Only left click for drawing
      setIsDrawing(true);
      applyEraserStroke(e);
      return;
    }
    if (e.currentTarget) e.currentTarget.style.cursor = 'grabbing';
    canvasEvents.onMouseDown(e);
  };

  const applyEraserStroke = (e: React.PointerEvent<HTMLDivElement>) => {
    const renderer = rendererRef.current;
    if (!renderer || !editingState || !eraserState) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const imgCoords = renderer.screenToImageCoords(mouseX, mouseY, editingState, {
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY
    });
    
    if (imgCoords) {
      renderer.applyBrushStroke(imgCoords.x, imgCoords.y, eraserState.size, eraserState.mode);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCropping) return;
    if (isErasing) {
      // Panning mode — delegate to viewport controller
      if (isPanningInEraser) {
        canvasEvents.onMouseMove(e);
        return;
      }

      // Track whether mouse is over the image for cursor switching
      if (imgBounds) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          const isInside = mouseX >= imgBounds.drawX && mouseX <= imgBounds.drawX + imgBounds.drawW &&
                           mouseY >= imgBounds.drawY && mouseY <= imgBounds.drawY + imgBounds.drawH;
          if (isInside !== isHoveringImage) {
            setIsHoveringImage(isInside);
          }
        }
      }

      if (isDrawing && eraserState?.mode !== 'pan') {
        applyEraserStroke(e);
      }
      return;
    }
    canvasEvents.onMouseMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isCropping) return;
    if (isErasing) {
      // End panning mode
      if (isPanningInEraser) {
        setIsPanningInEraser(false);
        canvasEvents.onMouseUp();
        return;
      }
      if (isDrawing) {
        setIsDrawing(false);
        const renderer = rendererRef.current;
        if (renderer) {
          renderer.getMaskDataUrl().then((newMaskUrl) => {
            if (newMaskUrl) {
              setBackgroundRemoved(newMaskUrl);
            }
          }).catch(console.error);
        }
      }
      return;
    }
    if (e.currentTarget) e.currentTarget.style.cursor = 'grab';
    canvasEvents.onMouseUp();
  };

  const getBrushPreviewDiameter = () => {
    if (!project.originalImage || !eraserState) return 0;
    const container = containerRef.current;
    if (!container) return 0;
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = project.originalImage.dimensions.width;
    const ih = project.originalImage.dimensions.height;
    
    const fitScale = Math.min(cw / iw, ch / ih) * viewport.zoom;
    const brushDiameterPixels = eraserState.size * 2;
    return Math.max(4, brushDiameterPixels * fitScale);
  };

  // Memoize the SVG brush cursor to avoid expensive re-encoding on every render
  const brushCursor = useMemo(() => {
    if (!isErasing || !eraserState || eraserState.mode === 'pan' || !project.originalImage) return null;
    
    const container = containerRef.current;
    if (!container) return null;
    
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = project.originalImage.dimensions.width;
    const ih = project.originalImage.dimensions.height;
    
    const fitScale = Math.min(cw / iw, ch / ih) * viewport.zoom;
    const brushDiameterPixels = eraserState.size * 2; // size is radius
    const screenDiameter = Math.max(4, brushDiameterPixels * fitScale);
    const half = screenDiameter / 2;
    
    const isEraseMode = eraserState.mode === 'erase';
    const strokeColor = isEraseMode ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
    const fillColor = isEraseMode ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.15)';
    
    const svg = `
      <svg width="${screenDiameter}" height="${screenDiameter}" viewBox="0 0 ${screenDiameter} ${screenDiameter}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${half}" cy="${half}" r="${Math.max(1, half - 1)}" fill="${fillColor}" stroke="white" stroke-width="1.5" />
        <circle cx="${half}" cy="${half}" r="${Math.max(1, half - 1)}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="2,2" />
        <line x1="${half}" y1="${half - 3}" x2="${half}" y2="${half + 3}" stroke="black" stroke-width="1" />
        <line x1="${half - 3}" y1="${half}" x2="${half + 3}" y2="${half}" stroke="black" stroke-width="1" />
      </svg>
    `.replace(/\s+/g, ' ').trim();

    const encoded = btoa(svg);
    return `url("data:image/svg+xml;base64,${encoded}") ${half} ${half}, crosshair`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isErasing, eraserState?.size, eraserState?.mode, viewport.zoom, project.originalImage]);

  const getCursor = () => {
    if (isCropping) return 'crosshair';
    if (!isErasing || !eraserState || !project.originalImage) return 'grab';
    if (isSpaceDown.current || isPanningInEraser || eraserState.mode === 'pan') return 'grab';
    if (!isHoveringImage) return 'grab';
    return brushCursor ?? 'crosshair';
  };

  const previewDiam = (isErasing && showPreviewCircle) ? getBrushPreviewDiameter() : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: getCursor(),
        userSelect: 'none',
        touchAction: 'none' // Prevent scrolling while drawing on touch devices
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Brush Size Preview Overlay */}
      {isErasing && showPreviewCircle && eraserState && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 50,
            width: previewDiam,
            height: previewDiam,
            borderRadius: '50%',
            border: `1.5px dashed ${eraserState.mode === 'erase' ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)'}`,
            backgroundColor: eraserState.mode === 'erase' ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 255, 0, 0.15)',
            boxShadow: '0 0 0 1.5px white',
            transition: 'width 0.1s, height 0.1s, opacity 0.2s',
          }}
        />
      )}

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

      {/* Upscale Indicator */}
      {project.originalImageBeforeUpscale && (
        <div
          style={{
            position: 'absolute',
            bottom: 'var(--space-md)',
            right: 'var(--space-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <span style={{ color: 'var(--color-primary)' }}>✨</span>
          2x HD Upscaled
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
