import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpscaler } from '@/hooks/useUpscaler';

export function UpscalePanel() {
  const { status, progress, upscaleImage } = useUpscaler();

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
          onClick={upscaleImage}
          disabled={status === 'processing'}
        >
          {status === 'processing' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Upscaling... {progress}%
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
    </div>
  );
}
