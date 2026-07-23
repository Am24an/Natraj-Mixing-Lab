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
      <div className="flex flex-col h-full space-y-6">
        <div>
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">
            Magic Eraser
          </h2>
        </div>
        <div className="p-4 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-md flex flex-col items-center text-center gap-3">
          <Eraser size={32} className="text-[var(--color-text-muted)]" />
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            You need to remove the background first before you can use the Magic Eraser to clean up the mask!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">
          Magic Eraser
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Manually cleanup background residue or restore missing parts.
        </p>
      </div>

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
          title="Pan & Move photo freely"
        >
          <Hand size={14} className="mr-1 shrink-0" />
          Move Photo
        </Button>
      </div>

      {/* Center Photo Action Button */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full text-[12px] flex items-center justify-center gap-2 py-2"
        onClick={() => viewportController.fitToView()}
      >
        <Maximize2 size={14} />
        Center & Fit Photo to Screen
      </Button>

      {/* Brush Size Slider (Hidden when in pan mode) */}
      {eraser.mode !== 'pan' && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-3 bg-[var(--color-surface-secondary)] rounded-md border border-[var(--color-border)]">
        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text-primary)]">Navigation Tip:</strong> You can right-click + drag, middle-click + drag, or hold Spacebar anytime to move the photo! Click "Move Photo" or "Center & Fit" above to adjust photo position.
        </p>
      </div>
    </div>
  );
}
