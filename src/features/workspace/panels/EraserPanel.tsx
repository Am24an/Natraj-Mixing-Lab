import { useEditorStore } from '@/stores/editorStore';
import { Slider } from '@/components/ui/Slider';
import { Eraser, Pencil, Hand, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { viewportController } from '@/core/rendering/ViewportController';

export function EraserPanel() {
  const eraser = useEditorStore((s) => s.project?.editingState.eraser);
  const background = useEditorStore((s) => s.project?.editingState.background);
  const updateEraser = useEditorStore((s) => s.updateEraser);

  if (!eraser || !background) return null;

  if (!background.isRemoved) {
    return (
      <div className="flex flex-col h-full space-y-4">
        <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
          Mask Brush
        </h2>
        <div className="p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-md flex flex-col items-center text-center gap-3">
          <Eraser size={28} className="text-[var(--color-text-muted)]" />
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Remove background first to use the mask brush.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
        Mask Brush
      </h2>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant={eraser.mode === 'erase' ? 'primary' : 'secondary'}
          size="sm"
          className="text-[12px] px-1 py-2"
          onClick={() => updateEraser({ mode: 'erase' })}
        >
          <Eraser size={14} className="mr-1 shrink-0" />
          Erase
        </Button>
        <Button
          variant={eraser.mode === 'restore' ? 'primary' : 'secondary'}
          size="sm"
          className="text-[12px] px-1 py-2"
          onClick={() => updateEraser({ mode: 'restore' })}
        >
          <Pencil size={14} className="mr-1 shrink-0" />
          Restore
        </Button>
        <Button
          variant={eraser.mode === 'pan' ? 'primary' : 'secondary'}
          size="sm"
          className="text-[12px] px-1 py-2"
          onClick={() => updateEraser({ mode: 'pan' })}
        >
          <Hand size={14} className="mr-1 shrink-0" />
          Move
        </Button>
      </div>

      {/* Center & Fit */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full text-[12px] flex items-center justify-center gap-2 py-1.5"
        onClick={() => viewportController.fitToView()}
      >
        <Maximize2 size={14} />
        Center Photo
      </Button>

      {/* Brush Size Slider (hidden in pan mode) */}
      {eraser.mode !== 'pan' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Brush Size
            </span>
            <span className="text-[12px] text-[var(--color-text-secondary)] w-12 text-right">
              {eraser.size}px
            </span>
          </div>
          <Slider
            min={1}
            max={200}
            step={1}
            value={eraser.size}
            onChange={(val) => updateEraser({ size: val })}
          />
        </div>
      )}

      <div className="p-2.5 bg-[var(--color-surface-secondary)] rounded-md border border-[var(--color-border)]">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          Spacebar + drag or right-click drag to move photo.
        </p>
      </div>
    </div>
  );
}
