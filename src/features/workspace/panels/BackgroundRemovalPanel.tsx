import { useEditorStore } from '@/stores/editorStore';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Wand2, Lock, AlertCircle, Loader2 } from 'lucide-react';

export function BackgroundRemovalPanel() {
  const { removeBackground, engineStatus } = useAI();
  const background = useEditorStore((s) => s.project?.editingState.background);
  const resetBackground = useEditorStore((s) => s.resetBackground);

  if (!background) return null;

  const { isRemoved, isProcessing, processingProgress, error } = background;
  const isButtonDisabled = isProcessing || engineStatus === 'processing';

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--color-text)] mb-1">
          Background Removal
        </h2>
        <p className="text-[14px] text-[var(--color-text-muted)]">
          AI-powered subject extraction. Works online.
        </p>
      </div>

      {/* Status & Action */}
      <div className="bg-[var(--color-surface-hover)] rounded-xl border border-[var(--color-border)] p-5 flex flex-col items-center gap-4">
        {/* State display */}
        {isProcessing ? (
          <div className="flex flex-col items-center w-full gap-3">
            <Loader2 size={28} className="text-[var(--color-primary)] animate-spin" />
            <span className="text-[13px] font-semibold text-[var(--color-primary)]">
              Processing… {processingProgress}%
            </span>
            <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-[var(--color-error)] text-center gap-2">
            <AlertCircle size={28} />
            <span className="text-[13px] font-medium">{error}</span>
          </div>
        ) : isRemoved ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle size={28} />
            <span className="text-[16px] font-semibold">Background Removed</span>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--color-text-muted)] text-center">
            Click the button below to extract the subject.
            <br />
            <span className="text-[11px] opacity-70">First use downloads AI model (~40MB)</span>
          </div>
        )}

        {/* Main action button */}
        <Button
          variant={isRemoved ? 'secondary' : 'primary'}
          className="w-full"
          onClick={() => { void removeBackground(); }}
          disabled={isButtonDisabled}
        >
          {isProcessing
            ? <Loader2 size={16} className="mr-2 animate-spin" />
            : <Wand2 size={16} className="mr-2" />
          }
          {isProcessing ? `Processing… ${processingProgress}%` : isRemoved ? 'Re-Process' : 'Remove Background'}
        </Button>

        {/* Reset button if removed */}
        {isRemoved && (
          <button
            onClick={resetBackground}
            className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors underline underline-offset-2"
          >
            Reset to original
          </button>
        )}
      </div>

      {/* Tech details (Hidden on mobile to save space) */}
      <div className="hidden md:block space-y-2">
        {[
          { label: 'Model', value: 'U2Net' },
          { label: 'Processing', value: 'On-device via WebAssembly' },
          { label: 'Privacy', value: '100% client-side' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
            <span className="text-[12px] text-[var(--color-text)] font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Privacy note (Hidden on mobile) */}
      <div className="hidden md:flex mt-auto items-start gap-2 text-[var(--color-text-muted)]">
        <Lock size={14} className="mt-0.5 shrink-0" />
        <p className="text-[11px] leading-relaxed">
          Image processing happens in your browser. Your photos are never uploaded to any server.
        </p>
      </div>
    </div>
  );
}
