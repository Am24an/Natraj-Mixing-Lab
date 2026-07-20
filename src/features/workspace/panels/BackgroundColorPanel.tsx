import { useEditorStore, usePreferences } from '@/stores/editorStore';
import { PASSPORT_COLOR_PRESETS } from '@/types';
import { cn } from '@/utils/cn';
import { useRef } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function BackgroundColorPanel() {
  const background = useEditorStore((s) => s.project?.editingState.background);
  const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);
  const addRecentBackgroundColor = useEditorStore((s) => s.addRecentBackgroundColor);
  const preferences = usePreferences();
  const colorInputRef = useRef<HTMLInputElement>(null);

  if (!background) return null;

  const currentColor = background.replacementColor ?? '#FFFFFF';
  const recentColors = preferences?.recentBackgroundColors || [];

  const handleColorChange = (color: string) => {
    setBackgroundColor(color);
    addRecentBackgroundColor(color);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        height: '100%',
        paddingRight: 'var(--space-md)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
          Background Color
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Pick any color or choose a passport preset.
        </p>
      </div>

      <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        
        {/* Custom Color Picker */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Custom Color</label>
          <div className="flex items-center gap-3">
            <div
              className="relative w-12 h-12 rounded-lg border-2 border-[var(--color-border)] cursor-pointer hover:border-[var(--color-primary)] transition-colors overflow-hidden shrink-0"
              style={{ background: currentColor, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              onClick={() => colorInputRef.current?.click()}
              title="Click to open color picker"
            >
              <input
                ref={colorInputRef}
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
              />
            </div>
            
            <input
              type="text"
              value={currentColor.toUpperCase()}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) handleColorChange(v);
                }
              }}
              maxLength={7}
              className="flex-1 w-full h-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 font-mono text-[14px] text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)] transition-all uppercase min-w-0"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        {/* Clear Button */}
        <Button
          variant="secondary"
          className="w-full h-10 flex-shrink-0"
          onClick={() => setBackgroundColor(null)}
          leftIcon={<Eraser size={16} />}
        >
          Clear Background
        </Button>
      </div>

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="pt-2">
          <h3 className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Recent Colors
          </h3>
          <div className="flex gap-2">
            {recentColors.map((color, i) => (
              <button
                key={i}
                onClick={() => handleColorChange(color)}
                title={`Recent: ${color.toUpperCase()}`}
                className={cn(
                  'w-8 h-8 rounded-full border transition-all cursor-pointer flex-shrink-0',
                  background.replacementColor === color
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                )}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Passport Presets */}
      <div className="pt-2">
        <h3 className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Passport Presets
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {PASSPORT_COLOR_PRESETS.map((preset) => {
            const isActive = background.replacementColor === preset.color;
            return (
              <button
                key={preset.id}
                onClick={() => handleColorChange(preset.color)}
                title={`${preset.name} — ${preset.description}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer bg-[var(--color-surface)] shadow-sm min-w-0',
                  isActive
                    ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ background: preset.color, border: '1px solid rgba(0,0,0,0.1)' }}
                />
                <span className="text-[13px] font-medium text-[var(--color-text-primary)] text-left truncate leading-tight min-w-0">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-4">
        <p className="text-[12px] text-[var(--color-text-muted)] p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] leading-relaxed flex gap-2">
          <span className="text-[var(--color-info)]">💡</span>
          <span>Color is applied behind the extracted subject. Ensure you remove the background first!</span>
        </p>
      </div>
    </div>
  );
}
