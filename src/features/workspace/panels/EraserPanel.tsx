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
      <div className="flex flex-col h-full space-y-4 p-1">
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
    <div className="flex flex-col h-full gap-5 p-1">
      <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">
        Mask Brush
      </h2>

      {/* Mode Selector */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Brush Mode
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant={eraser.mode === 'erase' ? 'primary' : 'secondary'}
            size="sm"
            className="text-[12px] px-2 py-2.5 flex items-center justify-center gap-1.5"
            onClick={() => updateEraser({ mode: 'erase' })}
            title="Erase background [X to toggle]"
          >
            <Eraser size={14} className="shrink-0" />
            Erase
          </Button>
          <Button
            variant={eraser.mode === 'restore' ? 'primary' : 'secondary'}
            size="sm"
            className="text-[12px] px-2 py-2.5 flex items-center justify-center gap-1.5"
            onClick={() => updateEraser({ mode: 'restore' })}
            title="Restore subject [X to toggle]"
          >
            <Pencil size={14} className="shrink-0" />
            Restore
          </Button>
        </div>
      </div>

      {/* Center & Fit Photo Button */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Viewport Control
        </span>
        <Button
          variant="secondary"
          size="sm"
          className="w-full text-[12px] flex items-center justify-center gap-2 py-2.5"
          onClick={() => viewportController.fitToView()}
          title="Center & fit photo to screen [Ctrl+0]"
        >
          <Maximize2 size={14} />
          Center Photo
        </Button>
      </div>

      {/* Brush Size Slider */}
      <div className="flex flex-col gap-2.5 py-1">
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
            Brush Size
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">[  ]</span>
            <span className="text-[12px] font-semibold text-[var(--color-text-primary)] w-12 text-right font-mono">
              {eraser.size}px
            </span>
          </div>
        </div>
        <Slider
          min={1}
          max={200}
          step={1}
          value={eraser.size}
          onChange={(val) => updateEraser({ size: val })}
        />
      </div>

      {/* Move mode button — shown as separate action with clear spacing */}
      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Pan & Move
        </span>
        <Button
          variant={eraser.mode === 'pan' ? 'primary' : 'secondary'}
          size="sm"
          className="w-full text-[12px] flex items-center justify-center gap-2 py-2.5"
          onClick={() => updateEraser({ mode: eraser.mode === 'pan' ? 'erase' : 'pan' })}
          title="Move photo freely (or hold Spacebar / right-click drag)"
        >
          <Hand size={14} />
          {eraser.mode === 'pan' ? 'Exit Move Mode' : 'Move Photo'}
        </Button>
      </div>

      {/* Shortcut tip with distinct margin */}
      <div className="p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] mt-auto">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text-secondary)]">Shortcuts: </strong>
          <kbd className="text-[10px] font-mono bg-[var(--color-border)] px-1.5 py-0.5 rounded">X</kbd> toggle mode ·{' '}
          <kbd className="text-[10px] font-mono bg-[var(--color-border)] px-1.5 py-0.5 rounded">[ ]</kbd> size ·{' '}
          <kbd className="text-[10px] font-mono bg-[var(--color-border)] px-1.5 py-0.5 rounded">Space</kbd>+drag to pan
        </p>
      </div>
    </div>
  );
}
