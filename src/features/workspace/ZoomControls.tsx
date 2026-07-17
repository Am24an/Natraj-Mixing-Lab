import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ZoomControlsProps {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

/**
 * ZoomControls — floating overlay at the bottom-center of the canvas.
 * Shows current zoom %, and zoom in/out/fit buttons.
 */
export function ZoomControls({ zoomPercent, onZoomIn, onZoomOut, onFit }: ZoomControlsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Zoom controls"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-full)',
        padding: '4px',
        boxShadow: 'var(--shadow-md)',
        zIndex: 'var(--z-toolbar)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out (Ctrl −)"
        id="zoom-out-btn"
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        <ZoomOut size={15} strokeWidth={2} />
      </Button>

      {/* Zoom percentage — click to reset to fit */}
      <button
        type="button"
        onClick={onFit}
        title="Click to fit to view (Ctrl 0)"
        aria-label={`Zoom: ${zoomPercent}%. Click to fit`}
        className="zoom-percent-btn"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          minWidth: '48px',
          textAlign: 'center',
          padding: '0 4px',
          fontFamily: 'var(--font-family-primary)',
          letterSpacing: '-0.02em',
          transition: `color var(--duration-hover) var(--easing-out)`,
        }}
      >
        {zoomPercent}%
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in (Ctrl +)"
        id="zoom-in-btn"
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        <ZoomIn size={15} strokeWidth={2} />
      </Button>

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: '1px',
          height: '16px',
          background: 'var(--color-border)',
          margin: '0 2px',
          flexShrink: 0,
        }}
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onFit}
        aria-label="Fit to view"
        title="Fit to view (Ctrl 0)"
        id="zoom-fit-btn"
        style={{ borderRadius: 'var(--radius-full)' }}
      >
        <Maximize2 size={14} strokeWidth={2} />
      </Button>
    </div>
  );
}
