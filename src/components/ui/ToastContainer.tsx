import { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEditorStore, useToasts } from '@/stores/editorStore';
import type { ToastMessage, ToastVariant } from '@/types';
import { cn } from '@/utils/cn';

// --------------------------------------------------------------------------
// Toast Icons
// --------------------------------------------------------------------------

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={16} strokeWidth={2} />,
  error: <AlertCircle size={16} strokeWidth={2} />,
  warning: <AlertTriangle size={16} strokeWidth={2} />,
  info: <Info size={16} strokeWidth={2} />,
};

const COLORS: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'var(--color-success-bg)',
    icon: 'var(--color-success)',
    border: 'var(--color-success)',
  },
  error: {
    bg: 'var(--color-error-bg)',
    icon: 'var(--color-error)',
    border: 'var(--color-error)',
  },
  warning: {
    bg: 'var(--color-warning-bg)',
    icon: 'var(--color-warning)',
    border: 'var(--color-warning)',
  },
  info: {
    bg: 'var(--color-info-bg)',
    icon: 'var(--color-info)',
    border: 'var(--color-info)',
  },
};

// --------------------------------------------------------------------------
// Individual Toast Item
// --------------------------------------------------------------------------

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = COLORS[toast.variant];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('animate-slide-up flex items-start gap-3 rounded-[var(--radius-lg)] p-4')}
      style={{
        background: 'var(--color-surface)',
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${colors.border}`,
        boxShadow: 'var(--shadow-lg)',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      {/* Icon */}
      <span style={{ color: colors.icon, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[toast.variant]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {toast.description}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-muted)',
          padding: '0',
          flexShrink: 0,
          transition: `color var(--duration-hover) var(--easing-out)`,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// --------------------------------------------------------------------------
// Toast Container
// --------------------------------------------------------------------------

export function ToastContainer() {
  const toasts = useToasts();
  const removeToast = useEditorStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 'var(--z-toast)',
        pointerEvents: 'auto',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
