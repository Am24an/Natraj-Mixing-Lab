// =============================================================================
// CompareSlider — In-canvas before/after split view (Remini-style)
// Renders as an absolute overlay over the canvas.
// Left = original, Right = edited (current canvas render).
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

interface CompareSliderProps {
  /** Original image data URL */
  originalDataUrl: string;
}

export function CompareSlider({ originalDataUrl }: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sliderX, setSliderX] = useState(50); // percentage 0–100
  const isDragging = useRef(false);

  // Draw the original image onto the left canvas whenever it changes
  useEffect(() => {
    const oc = originalCanvasRef.current;
    const container = containerRef.current;
    if (!oc || !container || !originalDataUrl) return;

    const img = new Image();
    img.onload = () => {
      // Match the main canvas dimensions
      const w = container.clientWidth;
      const h = container.clientHeight;
      oc.width = w;
      oc.height = h;
      const ctx = oc.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);

      // Fit the image to container (same logic as CanvasRenderer)
      const scaleW = w / img.naturalWidth;
      const scaleH = h / img.naturalHeight;
      const fitScale = Math.min(scaleW, scaleH, 1);
      const drawW = img.naturalWidth * fitScale;
      const drawH = img.naturalHeight * fitScale;
      const drawX = (w - drawW) / 2;
      const drawY = (h - drawH) / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    };
    img.src = originalDataUrl;
  }, [originalDataUrl]);

  const getSliderXFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
    const container = containerRef.current;
    if (!container) return 50;
    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * 100;
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      setSliderX(getSliderXFromEvent(e));
    };
    const onUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [getSliderXFromEvent]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
      }}
      aria-label="Before and after comparison slider"
    >
      {/* LEFT side — original image */}
      <canvas
        ref={originalCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          // Clip to the left of the slider
          clipPath: `inset(0 ${100 - sliderX}% 0 0)`,
        }}
        aria-hidden="true"
      />

      {/* Label: BEFORE */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: Math.min(sliderX - 2, 80) + '%',
          transform: 'translateX(-100%)',
          padding: '3px 10px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          borderRadius: 4,
          pointerEvents: 'none',
          opacity: sliderX > 10 ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        BEFORE
      </div>

      {/* Label: AFTER */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: Math.max(sliderX + 2, 5) + '%',
          padding: '3px 10px',
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          borderRadius: 4,
          pointerEvents: 'none',
          opacity: sliderX < 90 ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        AFTER
      </div>

      {/* Vertical divider line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${sliderX}%`,
          transform: 'translateX(-50%)',
          width: 2,
          background: '#ffffff',
          boxShadow: '0 0 8px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}
      />

      {/* Drag handle circle */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        style={{
          position: 'absolute',
          top: '50%',
          left: `${sliderX}%`,
          transform: 'translate(-50%, -50%)',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          cursor: 'ew-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          border: '2px solid rgba(0,0,0,0.12)',
        }}
        aria-label="Drag to compare"
      >
        {/* Arrow icons */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M6 9H12M6 9L4 7M6 9L4 11M12 9L14 7M12 9L14 11" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
