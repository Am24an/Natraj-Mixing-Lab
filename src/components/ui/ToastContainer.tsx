import { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEditorStore, useToasts } from '@/stores/editorStore';
import type { ToastMessage, ToastVariant } from '@/types';
import { cn } from '@/utils/cn';

// Toast Icons

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

// Individual Toast Item

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
      className={cn('animate-slide-up flex items-center gap-3 p-3 pr-4')}
      style={{
        background: 'var(--color-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid var(--color-border)`,
        borderRadius: '9999px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        minWidth: '240px',
        maxWidth: '400px',
      }}
    >
      {/* Icon Circle */}
      <div 
        style={{ 
          background: colors.bg, 
          color: colors.icon, 
          flexShrink: 0,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {ICONS[toast.variant]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className="text-[13px] font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p
            className="text-[11px] mt-0.5"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.2 }}
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
          padding: '4px',
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: `all var(--duration-hover) var(--easing-out)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-text-muted)';
          e.currentTarget.style.background = 'none';
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// Toast Container

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
