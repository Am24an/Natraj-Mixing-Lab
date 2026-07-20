// ExportDialog — HD export with format, quality, and pixel math (Single Photo Only)

import { useState } from 'react';
import { X, Download, FileImage, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';
import { ExportService } from '@/core/processing/ExportService';

interface ExportDialogProps {
  onClose: () => void;
}

type Format = 'jpeg' | 'png' | 'webp';

const FORMATS: { value: Format; label: string; note: string }[] = [
  { value: 'jpeg', label: 'JPEG', note: 'Best for standard photos' },
  { value: 'png', label: 'PNG', note: 'Lossless, supports transparency (Recommended)' },
  { value: 'webp', label: 'WebP', note: 'Modern format, great quality' },
];

export function ExportDialog({ onClose }: ExportDialogProps) {
  const project = useEditorStore((s) => s.project);
  const toast = useToast();

  const [format, setFormat] = useState<Format>('png'); // Default to PNG for best quality BG removal
  const [quality, setQuality] = useState(100);
  const [isExporting, setIsExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    if (!project?.originalImage) {
      toast.error('No image loaded', 'Please open a photo first.');
      return;
    }

    setIsExporting(true);
    try {
      await ExportService.exportProject(project, format, quality);
      setDone(true);
      toast.success('Export Complete', `Saved as ${format.toUpperCase()}`);
      setTimeout(onClose, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Export Failed', msg);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export image"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-dialog)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: 480,
          maxWidth: '92vw',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
            Export Photo
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close"><X size={16} /></Button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Format picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 10 }}>
              File Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${format === f.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: format === f.value ? 'var(--color-primary-light, rgba(99,102,241,0.1))' : 'var(--color-surface-hover)',
                    color: format === f.value ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <FileImage size={18} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{f.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quality slider — hidden for PNG (lossless) */}
          {format !== 'png' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Quality
                </label>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>{quality}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 4 }}>
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}

          {/* Summary */}
          {project?.originalImage && (
            <div style={{ background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <FileImage size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong style={{ color: 'var(--color-text)' }}>{project.name}</strong>
                {' · '}
                {format.toUpperCase()}
                {format !== 'png' ? ` at ${quality}%` : ' (lossless)'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--color-border)' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isExporting} style={{ paddingLeft: '24px', paddingRight: '24px', flexShrink: 0 }}>Cancel</Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={done ? <CheckCircle size={15} /> : <Download size={15} />}
            onClick={() => { void handleExport(); }}
            disabled={isExporting || !project?.originalImage}
            style={{ paddingLeft: '24px', paddingRight: '24px', flexShrink: 0 }}
          >
            {isExporting ? 'Exporting…' : done ? 'Downloaded!' : `Download Photo`}
          </Button>
        </div>
      </div>
    </div>
  );
}
