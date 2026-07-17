import { useEffect, useState, useCallback } from 'react';
import { Clock, Trash2, FolderOpen, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StoredProject } from '@/types';

interface RecentProjectsDialogProps {
  onClose: () => void;
  loadAllProjects: () => Promise<StoredProject[]>;
  deleteProject: (id: string) => Promise<void>;
}

/**
 * RecentProjectsDialog — lists all IndexedDB-saved projects.
 * Wired to real StorageEngine data.
 */
export function RecentProjectsDialog({ onClose, loadAllProjects, deleteProject }: RecentProjectsDialogProps) {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await loadAllProjects();
      setProjects(all);
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadAllProjects]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recent projects"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <FolderOpen size={18} strokeWidth={2} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                margin: 0,
              }}
            >
              Recent Projects
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
              {projects.length} saved project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '120px',
                color: 'var(--color-text-muted)',
                fontSize: '14px',
              }}
            >
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '40px 0',
                color: 'var(--color-text-muted)',
              }}
            >
              <AlertCircle size={32} strokeWidth={1.5} />
              <p style={{ margin: 0, fontSize: '14px' }}>No saved projects yet.</p>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Projects are auto-saved as you edit.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    transition: 'border-color var(--duration-hover) var(--easing-out)',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-canvas-bg)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <FolderOpen size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                      }}
                    >
                      <Clock size={11} />
                      {formatRelativeTime(p.updatedAt)}
                    </p>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); void handleDelete(p.id); }}
                    disabled={deletingId === p.id}
                    aria-label={`Delete project: ${p.name}`}
                    id={`delete-project-${p.id}`}
                    style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="ghost" size="sm" onClick={onClose} id="recent-projects-close">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
