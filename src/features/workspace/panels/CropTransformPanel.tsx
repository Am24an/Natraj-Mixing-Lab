// CropTransformPanel — Interactive Crop using react-image-crop
// The crop box is rendered as an overlay OVER the canvas inside EditingCanvas.
// This panel shows aspect ratio presets, rotation and flip controls only.

import { useEditorStore } from '@/stores/editorStore';
import type { CropPreset } from '@/types';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

const PRESETS: { label: string; sub: string; preset: CropPreset; aspect?: number }[] = [
  { label: 'Passport', sub: '35×45mm', preset: '35x45', aspect: 35 / 45 },
  { label: 'Square', sub: '1:1', preset: 'square', aspect: 1 },
  { label: 'US Passport', sub: '2×2 in', preset: '2x2', aspect: 1 },
  { label: 'Freeform', sub: 'Custom', preset: 'freeform', aspect: undefined },
];

export function CropTransformPanel() {
  const cropState = useEditorStore((s) => s.project?.editingState.crop);
  const updateCrop = useEditorStore((s) => s.updateCrop);
  const resetCrop = useEditorStore((s) => s.resetCrop);

  // Signal canvas to activate the interactive crop overlay
  useEffect(() => {
    updateCrop({ isActive: true });
    return () => updateCrop({ isActive: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dimensions = useEditorStore((s) => s.project?.originalImage?.dimensions);

  if (!cropState) return null;

  const handlePresetSelect = (preset: CropPreset, aspect?: number) => {
    if (aspect && dimensions) {
      const imgW = dimensions.width;
      const imgH = dimensions.height;
      const imgAspect = imgW / imgH;

      let cropPctW = 80;
      let cropPctH = 80;

      if (aspect < imgAspect) {
        // Height is the limiting factor (taller than image)
        cropPctH = 80;
        const physicalH = imgH * 0.8;
        const physicalW = physicalH * aspect;
        cropPctW = (physicalW / imgW) * 100;
      } else {
        // Width is the limiting factor (wider than image)
        cropPctW = 80;
        const physicalW = imgW * 0.8;
        const physicalH = physicalW / aspect;
        cropPctH = (physicalH / imgH) * 100;
      }

      const x = (100 - cropPctW) / 2;
      const y = (100 - cropPctH) / 2;

      updateCrop({ preset, aspect, x, y, width: cropPctW, height: cropPctH });
    } else {
      updateCrop({ preset, aspect, x: 0, y: 0, width: 100, height: 100 });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">Crop & Transform</h2>
        <p className="text-[14px] text-[var(--color-text-muted)]">
          Drag the handles on the image to crop.
        </p>
      </div>

      {/* Aspect Ratio Presets */}
      <section>
        <h3 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Aspect Ratio
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const isActive = cropState.preset === p.preset;
            return (
              <button
                key={p.preset}
                onClick={() => handlePresetSelect(p.preset, p.aspect)}
                className={cn(
                  'py-2 px-3 rounded border text-[13px] text-left transition-colors flex flex-col items-start relative',
                  isActive
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/40'
                )}
              >
                <span className="font-semibold mb-0.5">{p.label}</span>
                <span className={cn('text-[11px]', isActive ? 'text-[var(--color-primary)]/80' : 'text-[var(--color-text-muted)]')}>
                  {p.sub}
                </span>
                {isActive && <CheckCircle2 size={14} className="absolute top-2 right-2 opacity-50" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Rotation */}
      <section className="pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
          Rotation
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <RotateCcw
            size={16}
            className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)]"
            onClick={() => updateCrop({ rotation: Math.max(-180, cropState.rotation - 1) })}
          />
          <div className="flex-1">
            <Slider
              value={cropState.rotation}
              min={-180}
              max={180}
              step={0.5}
              onChange={(val) => updateCrop({ rotation: val })}
            />
          </div>
          <RotateCw
            size={16}
            className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)]"
            onClick={() => updateCrop({ rotation: Math.min(180, cropState.rotation + 1) })}
          />
        </div>
        <p className="text-center text-[12px] font-mono text-[var(--color-text-muted)]">
          {cropState.rotation.toFixed(1)}°
        </p>
      </section>

      {/* Flip & Quick Rotate */}
      <section className="pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Flip & Rotate
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <FlipHorizontal size={18} />, title: 'Flip H', onClick: () => updateCrop({ flipHorizontal: !cropState.flipHorizontal }) },
            { icon: <FlipVertical size={18} />, title: 'Flip V', onClick: () => updateCrop({ flipVertical: !cropState.flipVertical }) },
            { icon: <RotateCcw size={18} />, title: '−90°', onClick: () => updateCrop({ rotation: cropState.rotation - 90 }) },
            { icon: <RotateCw size={18} />, title: '+90°', onClick: () => updateCrop({ rotation: cropState.rotation + 90 }) },
          ].map((btn) => (
            <button
              key={btn.title}
              title={btn.title}
              onClick={btn.onClick}
              className="flex flex-col items-center gap-1 py-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/80 transition-colors text-[var(--color-text-primary)]"
            >
              {btn.icon}
              <span className="text-[10px] text-[var(--color-text-muted)]">{btn.title}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex-1" />

      {/* Reset & Apply */}
      <div className="pt-4 mt-auto space-y-3">
        <Button 
          variant="primary" 
          className="w-full"
          onClick={() => useEditorStore.getState().setActiveTool(null)}
        >
          <CheckCircle2 size={16} className="mr-2" /> Apply Crop
        </Button>
        <Button 
          variant="secondary" 
          className="w-full flex gap-2 text-[var(--color-error)] border-[var(--color-error)]/20 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
          onClick={resetCrop}
        >
          <RefreshCw size={16} /> Reset Crop Settings
        </Button>
      </div>
    </div>
  );
}
