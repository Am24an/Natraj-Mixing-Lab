import { Sparkles, Loader2, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpscaler } from '@/hooks/useUpscaler';
import { useProject } from '@/stores/editorStore';
import { useState } from 'react';

export function UpscalePanel() {
  const { status, progress, upscaleImage } = useUpscaler();
  const project = useProject();
  const [showBefore, setShowBefore] = useState(false);

  const beforeImg = project?.originalImageBeforeUpscale;
  const afterImg = project?.originalImage?.dataUrl;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-lg)',
        height: '100%',
        paddingRight: 'var(--space-md)', // scrollbar padding
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
          AI Upscaler
        </h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Intelligently double your image resolution (2x HD) directly in your browser using a neural network.
        </p>
      </div>

      <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)' }}>
        <Button
          variant="primary"
          className="w-full h-12 text-base font-semibold"
          onClick={() => void upscaleImage()}
          disabled={status === 'processing'}
        >
          {status === 'processing' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Upscaling... {progress}%
            </>
          ) : beforeImg ? (
            <>
              <CheckCircle2 size={20} />
              ✓ Upscaled to 2x (HD)
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Upscale 2x (HD)
            </>
          )}
        </Button>
      </div>

      {status === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            <span>Processing Image...</span>
            <span>{progress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '4px',
              background: 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--color-primary)',
                width: `${progress}%`,
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)', fontStyle: 'italic' }}>
            Downloading model and rendering details. This may take up to a minute on the first run.
          </p>
        </div>
      )}

      {beforeImg && afterImg && status !== 'processing' && (
        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)] mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
              Preview Result
            </h3>
            <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded-full">
              {showBefore ? 'Before (Original)' : 'After (Upscaled 2x)'}
            </span>
          </div>
          
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] group">
            {/* Checkerboard background for transparency */}
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZiIvPgo8cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNjY2MiLz4KPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNjY2MiLz4KPC9zdmc+')]"></div>
            
            <img 
              src={showBefore ? beforeImg : afterImg} 
              alt="Preview" 
              className="absolute inset-0 w-full h-full object-contain"
            />
            
            <button
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/60 text-white backdrop-blur-sm opacity-50 group-hover:opacity-100 transition-opacity hover:bg-black/80 active:bg-black flex items-center justify-center cursor-pointer select-none touch-none"
              onMouseDown={() => setShowBefore(true)}
              onMouseUp={() => setShowBefore(false)}
              onMouseLeave={() => setShowBefore(false)}
              onTouchStart={() => setShowBefore(true)}
              onTouchEnd={() => setShowBefore(false)}
              title="Hold to see original image"
            >
              <Eye size={16} />
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] text-center italic">
            Press and hold the eye icon to compare.
          </p>
        </div>
      )}
    </div>
  );
}
