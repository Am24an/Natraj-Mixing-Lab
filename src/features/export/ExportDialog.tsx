// =============================================================================
// ExportDialog — HD export with format, quality, and pixel math (Single Photo Only)
// =============================================================================

import { useState } from 'react';
import { X, Download, FileImage, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';
import { ImageProcessor } from '@/core/processing/ImageProcessor';

interface ExportDialogProps {
  onClose: () => void;
}

type Format = 'jpeg' | 'png' | 'webp';

const FORMATS: { value: Format; label: string; note: string }[] = [
  { value: 'jpeg', label: 'JPEG', note: 'Best for standard photos' },
  { value: 'png', label: 'PNG', note: 'Lossless, supports transparency (Recommended)' },
  { value: 'webp', label: 'WebP', note: 'Modern format, great quality' },
];

export function ExportDialog({ onClose }: ExportDialogProps) {
  const project = useEditorStore((s) => s.project);
  const toast = useToast();

  const [format, setFormat] = useState<Format>('png'); // Default to PNG for best quality BG removal
  const [quality, setQuality] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (!project?.originalImage) {
      toast.error('No image loaded', 'Please open a photo first.');
      return;
    }

    setIsExporting(true);
    try {
      const { editingState } = project;
      const { crop, background, enhancement } = editingState;

      // 1. Load Original Source at Full Resolution
      const src = new Image();
      src.src = project.originalImage.dataUrl;
      await new Promise<void>((res, rej) => {
        src.onload = () => res();
        src.onerror = () => rej(new Error('Failed to load source image'));
      });

      const origW = src.naturalWidth;
      const origH = src.naturalHeight;

      // 2. Calculate crop bounds exactly (fallback to full size if not cropped)
      const cx = crop.width === 0 ? 0 : (crop.x / 100) * origW;
      const cy = crop.height === 0 ? 0 : (crop.y / 100) * origH;
      const cw = crop.width === 0 ? origW : (crop.width / 100) * origW;
      const ch = crop.height === 0 ? origH : (crop.height / 100) * origH;

      // 3. Create single photo canvas
      const canvas = document.createElement('canvas');
      const isRotated = crop.rotation % 180 !== 0;
      canvas.width = Math.round(isRotated ? ch : cw);
      canvas.height = Math.round(isRotated ? cw : ch);
      const ctx = canvas.getContext('2d')!;

      // Background color
      if (background.replacementColor) {
        ctx.fillStyle = background.replacementColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // CSS Filters (Brightness, Contrast, Saturation)
      const filters: string[] = [];
      if (enhancement.brightness !== 0) filters.push(`brightness(${1 + enhancement.brightness / 100})`);
      if (enhancement.contrast !== 0) filters.push(`contrast(${1 + enhancement.contrast / 100})`);
      if (enhancement.saturation !== 0) filters.push(`saturate(${1 + enhancement.saturation / 100})`);
      if (filters.length > 0) ctx.filter = filters.join(' ');

      // Transform and draw
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((crop.rotation * Math.PI) / 180);
      ctx.scale(crop.flipHorizontal ? -1 : 1, crop.flipVertical ? -1 : 1);
      ctx.drawImage(src, cx, cy, cw, ch, -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
      ctx.filter = 'none';

      // 4. If background removed, maskDataUrl IS the final transparent result from @imgly
      // Draw it directly instead of original + mask compositing
      if (background.isRemoved && background.maskDataUrl) {
        // Clear and redraw using the result PNG
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Re-apply background color behind it
        if (background.replacementColor) {
          ctx.fillStyle = background.replacementColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const resultImg = new Image();
        resultImg.src = background.maskDataUrl;
        await new Promise<void>((res) => { resultImg.onload = () => res(); });

        // Recalculate crop bounds specifically for the mask image's dimensions
        const maskCx = (crop.width === 0 ? 0 : crop.x / 100) * resultImg.naturalWidth;
        const maskCy = (crop.height === 0 ? 0 : crop.y / 100) * resultImg.naturalHeight;
        const maskCw = (crop.width === 0 ? 1 : crop.width / 100) * resultImg.naturalWidth;
        const maskCh = (crop.height === 0 ? 1 : crop.height / 100) * resultImg.naturalHeight;

        // Apply CSS filters and transform again
        if (filters.length > 0) ctx.filter = filters.join(' ');
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((crop.rotation * Math.PI) / 180);
        ctx.scale(crop.flipHorizontal ? -1 : 1, crop.flipVertical ? -1 : 1);
        ctx.drawImage(resultImg, maskCx, maskCy, maskCw, maskCh, -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
        ctx.filter = 'none';
      }

      // 5. Apply Pixel Enhancements (Sharpness, Highlights, Shadows)
      if (enhancement.sharpness !== 0 || enhancement.highlights !== 0 || enhancement.shadows !== 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ImageProcessor.applyEnhancements(imageData, enhancement);
        ctx.putImageData(imageData, 0, 0);
      }

      // 6. Export Blob
      const mimeType = `image/${format}`;
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, mimeType, quality / 100)
      );

      if (!blob) throw new Error('Export failed — canvas returned empty blob');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDone(true);
      toast.success(`Exported as ${format.toUpperCase()}`, `${project.name}.${format}`);
      setTimeout(onClose, 1200);
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export image"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-dialog)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: 480,
          maxWidth: '92vw',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            Export Photo
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X size={16} /></Button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Format picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
              File Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${format === f.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: format === f.value ? 'var(--color-primary-light, rgba(99,102,241,0.1))' : 'var(--color-surface-hover)',
                    color: format === f.value ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <FileImage size={18} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{f.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider — hidden for PNG (lossless) */}
          {format !== 'png' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Quality
                </label>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{quality}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 4 }}>
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}

          {/* Summary */}
          {project?.originalImage && (
            <div style={{ background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <FileImage size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong style={{ color: 'var(--color-text)' }}>{project.name}</strong>
                {' · '}
                {format.toUpperCase()}
                {format !== 'png' ? ` at ${quality}%` : ' (lossless)'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isExporting} style={{ paddingLeft: '24px', paddingRight: '24px', flexShrink: 0 }}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={done ? <CheckCircle size={15} /> : <Download size={15} />}
            onClick={() => { void handleExport(); }}
            disabled={isExporting || !project?.originalImage}
            style={{ paddingLeft: '24px', paddingRight: '24px', flexShrink: 0 }}
          >
            {isExporting ? 'Exporting…' : done ? 'Downloaded!' : `Download Photo`}
          </Button>
        </div>
      </div>
    </div>
  );
}
