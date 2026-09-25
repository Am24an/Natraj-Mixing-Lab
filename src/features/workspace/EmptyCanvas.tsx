import { useRef } from 'react';
import { Upload, Shield, Image } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/stores/editorStore';
import { validateImageFile, loadImageFromFile, fileToDataUrl, mimeTypeToFormat, generateId } from '@/utils/image';
import type { OriginalImage, SupportedMimeType } from '@/types';
import { useToast } from '@/hooks/useToast';

const QUICK_PRESETS = [
  { flag: '🇺🇸', label: 'US Passport', size: '2×2 in (51×51mm)' },
  { flag: '🇮🇳', label: 'India Passport', size: '35×45mm' },
  { flag: '🇪🇺', label: 'Schengen / UK', size: '35×45mm' },
  { flag: '📄', label: 'ID & Visa', size: 'Standard' },
];

/**
 * EmptyCanvas component — renders photo upload dropzone, quick passport presets, and privacy badge.
 */
export function EmptyCanvas() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createProject = useEditorStore((s) => s.createProject);
  const toast = useToast();

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const file = fileList[0];

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error('Invalid file', validation.error);
      return;
    }

    try {
      const [img, dataUrl] = await Promise.all([
        loadImageFromFile(file),
        fileToDataUrl(file),
      ]);

      const originalImage: OriginalImage = {
        id: generateId(),
        file,
        name: file.name,
        format: mimeTypeToFormat(file.type as SupportedMimeType),
        mimeType: file.type as SupportedMimeType,
        size: file.size,
        dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        dataUrl,
        loadedAt: Date.now(),
      };

      createProject(originalImage);
      toast.success('Image loaded', `${file.name} is ready to edit.`);
    } catch {
      toast.error('Failed to load image', 'The file may be corrupted. Please try another image.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 'var(--space-xl)',
        gap: 'var(--space-lg)',
      }}
    >
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="region"
        aria-label="Image upload area"
        style={{
          width: '100%',
          maxWidth: '520px',
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-surface)',
          padding: 'var(--space-2xl) var(--space-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
          cursor: 'pointer',
          transition: `border-color var(--duration-hover) var(--easing-out), background var(--duration-hover) var(--easing-out)`,
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={() => fileInputRef.current?.click()}
        onMouseEnter={(e) => {
          (e.currentTarget).style.borderColor = 'var(--color-primary)';
          (e.currentTarget).style.background = 'var(--color-primary-light)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget).style.borderColor = 'var(--color-border)';
          (e.currentTarget).style.background = 'var(--color-surface)';
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)',
          }}
        >
          <Image size={32} strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', gap: '6px', display: 'flex', flexDirection: 'column' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}
          >
            Upload your photo
          </h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Drag & drop or click to choose photo
          </p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Supports JPEG · PNG · WebP · Up to 50MB
          </p>
        </div>

        {/* Quick Passport Preset Badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {QUICK_PRESETS.map((preset) => (
            <span
              key={preset.label}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] shadow-xs"
            >
              <span>{preset.flag}</span>
              <span>{preset.label}</span>
            </span>
          ))}
        </div>

        {/* Upload Button */}
        <Button
          variant="primary"
          size="lg"
          leftIcon={<Upload size={16} strokeWidth={2} />}
          style={{ paddingLeft: '32px', paddingRight: '32px', flexShrink: 0, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          id="upload-image-btn"
        >
          Choose Photo
        </Button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          aria-hidden="true"
          onChange={(e) => {
            void handleFiles(e.target.files);
          }}
        />
      </div>

      {/* Privacy Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Shield size={14} strokeWidth={2} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          100% Client-Side — Your photos stay on your device and are never uploaded
        </span>
      </div>
    </div>
  );
}
