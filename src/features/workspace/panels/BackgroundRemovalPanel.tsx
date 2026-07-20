import { useEditorStore } from '@/stores/editorStore';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Wand2, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';

type ModelVariant = 'auto' | 'isnet_quint8' | 'isnet';

export function BackgroundRemovalPanel() {
  const [selectedModel, setSelectedModel] = useState<ModelVariant>('auto');
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
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">
          Background Removal
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          AI-powered subject extraction. Works online.
        </p>
      </div>

      {/* Status & Action */}
      <div className="bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] p-5 flex flex-col items-center gap-4 shadow-sm">
        {/* State display */}
        {isProcessing ? (
          <div className="flex flex-col items-center w-full gap-3 py-2">
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
          <div className="flex flex-col items-center text-[var(--color-error)] text-center gap-2 bg-[var(--color-error-bg)] p-4 rounded-lg w-full border border-[var(--color-error)]/20">
            <AlertCircle size={24} />
            <span className="text-[13px] font-medium">{error}</span>
          </div>
        ) : isRemoved ? (
          <div className="flex flex-col items-center gap-3 w-full py-2">
            <div className="flex flex-col items-center gap-2 text-[var(--color-success)] bg-[var(--color-success-bg)] p-4 rounded-xl w-full border border-[var(--color-success)]/20 shadow-sm">
              <CheckCircle size={28} />
              <span className="text-[14px] font-semibold">Background Removed</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center w-full py-2">
            <div className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Ready to extract subject
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              Click the button below to automatically detect and remove the background.
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-1.5 rounded-full border border-[var(--color-primary)]/20">
              <Lock size={12} />
              <span>Downloads AI model (~40MB) first use</span>
            </div>
          </div>
        )}

        {/* Main action button */}
        <div className="w-full px-1">
          <Button
            variant={isRemoved ? 'secondary' : 'primary'}
            className="w-full shadow-sm"
            onClick={() => { void removeBackground(selectedModel); }}
            disabled={isButtonDisabled}
          >
            {isProcessing
              ? <Loader2 size={16} className="mr-2 animate-spin" />
              : <Wand2 size={16} className="mr-2" />
            }
            {isProcessing ? `Processing… ${processingProgress}%` : isRemoved ? 'Re-Process' : 'Remove Background'}
          </Button>
        </div>

        {/* Reset button if removed */}
        {isRemoved && (
          <button
            onClick={resetBackground}
            className="text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors underline underline-offset-4 mt-1"
          >
            Reset to original
          </button>
        )}
      </div>

      {/* Tech details (Hidden on mobile to save space) */}
      <div className="hidden md:block space-y-4">
        {/* Model Selector */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-[var(--color-text-primary)]">
            AI Model Quality
          </label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelVariant)}
            disabled={isButtonDisabled}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
          >
            <option value="auto">Auto (Smart Detect - Recommended)</option>
            <option value="isnet_quint8">Fast & Lightweight (IS-Net Quantized)</option>
            <option value="isnet">Extreme Quality (IS-Net - Best overall)</option>
          </select>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Architecture', value: 'Transformers.js (WebGPU)' },
          { label: 'Processing', value: 'On-device via WebAssembly' },
          { label: 'Privacy', value: '100% client-side' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-2 border-b border-[var(--color-border)]">
            <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>
            <span className="text-[12px] text-[var(--color-text)] font-medium">{value}</span>
          </div>
        ))}
        </div>
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
