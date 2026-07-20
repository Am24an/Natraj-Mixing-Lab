import { useEditorStore } from '@/stores/editorStore';
import { Slider } from '@/components/ui/Slider';
import { Eraser, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

      <div className="flex space-x-2">
        <Button
          variant={eraser.mode === 'erase' ? 'primary' : 'secondary'}
          className="flex-1"
          onClick={() => updateEraser({ mode: 'erase' })}
        >
          <Eraser size={16} className="mr-2" />
          Erase Residue
        </Button>
        <Button
          variant={eraser.mode === 'restore' ? 'primary' : 'secondary'}
          className="flex-1"
          onClick={() => updateEraser({ mode: 'restore' })}
        >
          <Pencil size={16} className="mr-2" />
          Restore
        </Button>
      </div>

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

      <div className="mt-4 p-3 bg-[var(--color-surface-secondary)] rounded-md border border-[var(--color-border)]">
        <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">
          <strong className="text-[var(--color-text-primary)]">Tip:</strong> Click and drag on the image to {eraser.mode === 'erase' ? 'remove unwanted background residue' : 'bring back parts of the original image'}. You can zoom in up to 500% using the mouse wheel for precise edits!
        </p>
      </div>
    </div>
  );
}
