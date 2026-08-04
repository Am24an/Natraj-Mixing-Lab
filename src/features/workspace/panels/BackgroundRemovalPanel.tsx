import { useEditorStore } from '@/stores/editorStore';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Wand2, Lock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';

type ModelVariant = 'isnet' | 'isnet_quint8' | 'isnet_fp16';

export function BackgroundRemovalPanel() {
  const [selectedModel, setSelectedModel] = useState<ModelVariant>('isnet');
  const { removeBackground, engineStatus } = useAI();
  const background = useEditorStore((s) => s.project?.editingState.background);
  const resetBackground = useEditorStore((s) => s.resetBackground);

  if (!background) return null;

  const { isRemoved, isProcessing, processingProgress, error } = background;
  const isButtonDisabled = isProcessing || engineStatus === 'processing';

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-1">
          Background Removal
        </h2>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          AI subject extraction and edge refinement.
        </p>
      </div>

      {/* Status & Action */}
      <div className="bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)] p-4 flex flex-col items-center gap-3 shadow-sm">
        {/* State display */}
        {isProcessing ? (
          <div className="flex flex-col items-center w-full gap-2.5 py-1">
            <Loader2 size={24} className="text-[var(--color-primary)] animate-spin" />
            <span className="text-[13px] font-semibold text-[var(--color-primary)]">
              Processing… {processingProgress}%
            </span>
            <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-[var(--color-error)] text-center gap-1.5 bg-[var(--color-error-bg)] p-3 rounded-lg w-full border border-[var(--color-error)]/20">
            <AlertCircle size={20} />
            <span className="text-[12px] font-medium">{error}</span>
          </div>
        ) : isRemoved ? (
          <div className="flex flex-col items-center gap-2 w-full py-1">
            <div className="flex items-center justify-center gap-2 text-[var(--color-success)] bg-[var(--color-success-bg)] p-3 rounded-xl w-full border border-[var(--color-success)]/20 shadow-sm">
              <CheckCircle size={20} />
              <span className="text-[13px] font-semibold">Background Removed</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center w-full py-1">
            <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Ready to extract subject
            </div>
            <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2.5 py-1 rounded-full border border-[var(--color-primary)]/20">
              <Lock size={11} />
              <span>On-device processing</span>
            </div>
          </div>
        )}

        {/* Main action button */}
        <div className="w-full">
          <Button
            variant={isRemoved ? 'secondary' : 'primary'}
            className="w-full shadow-sm"
            onClick={() => { void removeBackground(selectedModel); }}
            disabled={isButtonDisabled}
          >
            {isProcessing ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : isRemoved ? (
              <RefreshCw size={16} className="mr-2" />
            ) : (
              <Wand2 size={16} className="mr-2" />
            )}
            {isProcessing ? `Processing… ${processingProgress}%` : isRemoved ? 'Re-Process' : 'Remove Background'}
          </Button>
        </div>

        {/* Reset button if removed */}
        {isRemoved && (
          <button
            onClick={resetBackground}
            className="text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors underline underline-offset-4"
          >
            Reset to original
          </button>
        )}
      </div>

      {/* Model Quality Selector */}
      <div className="space-y-1.5">
        <label className="text-[13px] font-medium text-[var(--color-text-primary)]">
          AI Model Quality
        </label>
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as ModelVariant)}
          disabled={isButtonDisabled}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-2 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
        >
          <option value="isnet">Best Quality (IS-Net Full)</option>
          <option value="isnet_fp16">Balanced (IS-Net FP16)</option>
          <option value="isnet_quint8">Fast (IS-Net Quantized)</option>
        </select>
      </div>

      {/* Tech details (Hidden on mobile) */}
      <div className="hidden md:block space-y-1.5 pt-2 border-t border-[var(--color-border)]">
        {[
          { label: 'Architecture', value: 'IS-Net ONNX' },
          { label: 'Execution', value: 'WebAssembly / WebGPU' },
          { label: 'Privacy', value: '100% Client-Side' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between py-1 text-[12px]">
            <span className="text-[var(--color-text-muted)]">{label}</span>
            <span className="text-[var(--color-text-primary)] font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
