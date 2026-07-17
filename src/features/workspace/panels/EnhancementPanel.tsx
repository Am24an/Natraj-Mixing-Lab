import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { RefreshCw, Sun, Contrast, Droplets, SunDim, Moon } from 'lucide-react';

export function EnhancementPanel() {
  const enhancement = useEditorStore((s) => s.project?.editingState.enhancement);
  const updateEnhancement = useEditorStore((s) => s.updateEnhancement);
  const resetEnhancement = useEditorStore((s) => s.resetEnhancement);

  if (!enhancement) return null;

  const sliders = [
    { id: 'brightness', label: 'Brightness', icon: Sun, value: enhancement.brightness, min: -100, max: 100 },
    { id: 'contrast', label: 'Contrast', icon: Contrast, value: enhancement.contrast, min: -100, max: 100 },
    { id: 'saturation', label: 'Saturation', icon: Droplets, value: enhancement.saturation, min: -100, max: 100 },
    { id: 'highlights', label: 'Highlights', icon: SunDim, value: enhancement.highlights, min: -100, max: 100 },
    { id: 'shadows', label: 'Shadows', icon: Moon, value: enhancement.shadows, min: -100, max: 100 },
    { id: 'sharpness', label: 'Sharpness', icon: null, value: enhancement.sharpness, min: 0, max: 100 },
  ] as const;

  return (
    <div className="flex flex-col h-full space-y-8">
      {/* Section Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--color-text)] mb-1">
          Enhancement
        </h2>
        <p className="text-[14px] text-[var(--color-text-muted)]">
          Fine-tune lighting and colors.
        </p>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        {sliders.map((slider) => {
          const Icon = slider.icon;
          return (
            <div key={slider.id} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[13px] text-[var(--color-text)] flex items-center gap-2">
                  {Icon && <Icon size={14} className="text-[var(--color-text-muted)]" />}
                  {slider.label}
                </label>
                <span className="text-[12px] font-mono text-[var(--color-text-muted)]">
                  {slider.value > 0 ? '+' : ''}{slider.value}
                </span>
              </div>
              <Slider
                value={slider.value}
                min={slider.min}
                max={slider.max}
                step={1}
                onChange={(val) => updateEnhancement({ [slider.id]: val })}
              />
            </div>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset */}
      <div className="pt-4 border-t border-[var(--color-border)] mt-auto">
        <Button 
          variant="secondary" 
          className="w-full flex gap-2 text-[var(--color-error)] border-[var(--color-error)]/20 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
          onClick={resetEnhancement}
        >
          <RefreshCw size={16} /> Reset All Enhancements
        </Button>
      </div>
    </div>
  );
}
