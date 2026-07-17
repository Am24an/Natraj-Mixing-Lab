import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/stores/editorStore';

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const preferences = useEditorStore((s) => s.preferences);
  const updatePreferences = useEditorStore((s) => s.updatePreferences);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-dialog)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fade-in var(--duration-dialog) var(--easing-out)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="animate-scale-in"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: '440px',
          maxWidth: '90vw',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>Settings</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close settings"><X size={16} /></Button>
        </div>
        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Theme Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>Theme</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Choose light or dark mode</div>
            </div>
            <select
              style={{
                background: 'var(--color-surface-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 8px',
                fontSize: 'var(--font-size-sm)',
              }}
              value={preferences.theme}
              onChange={(e) => updatePreferences({ theme: e.target.value as any })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Auto Save Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>Auto Save</div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Automatically save changes to your browser</div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={preferences.autoSave}
                onChange={(e) => updatePreferences({ autoSave: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
