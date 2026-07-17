import { FolderOpen, Settings, Download, Camera, Undo2, Redo2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useHistory } from '@/hooks/useHistory';
import type { ProjectStatus } from '@/types';

interface TopNavigationProps {
  projectName?: string;
  projectStatus?: ProjectStatus;
  onExport: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onSave: () => Promise<void>;
}

export function TopNavigation({
  projectName,
  projectStatus,
  onExport,
  onOpenProjects,
  onOpenSettings,
  onSave,
}: TopNavigationProps) {
  const hasProject = !!projectName;
  const isUnsaved = projectStatus === 'unsaved';
  const { canUndo, canRedo, undo, redo, undoLabel, redoLabel } = useHistory();

  return (
    <header
      role="banner"
      style={{
        height: 'var(--nav-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--space-md)',
        gap: 'var(--space-md)',
        position: 'relative',
        zIndex: 'var(--z-toolbar)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Left — Brand */}
      <button 
        className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-80 transition-opacity text-left"
        onClick={() => window.location.reload()}
        title="Reload App"
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Camera size={18} color="white" strokeWidth={2} />
        </div>
        <div className="flex flex-col" style={{ gap: '1px' }}>
          <span
            className="hidden sm:inline"
            style={{
              fontSize: '15px',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
            }}
          >
            Natraj Mixing Lab
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              lineHeight: '1.2',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Passport Studio
          </span>
        </div>
      </button>

      {/* Divider */}
      <div
        aria-hidden="true"
        style={{
          width: '1px',
          height: '24px',
          background: 'var(--color-border)',
          flexShrink: 0,
        }}
      />

      {/* Center — Project Name + Status */}
      <div className="flex-1 flex items-center justify-center gap-2 min-w-0 hidden md:flex">
        {hasProject ? (
          <>
            <span
              className="text-sm font-medium truncate max-w-xs"
              style={{ color: 'var(--color-text-primary)' }}
              title={projectName}
            >
              {projectName}
            </span>
            <StatusBadge status={projectStatus} />
          </>
        ) : (
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No project open
          </span>
        )}
      </div>

      {/* Right — Actions */}
      <nav
        className="flex items-center gap-2 shrink-0"
        aria-label="Application actions"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo || !hasProject}
          aria-label={canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'}
          title={canUndo ? `Undo: ${undoLabel} (Ctrl Z)` : 'Nothing to undo'}
          id="nav-undo"
        >
          <Undo2 size={16} strokeWidth={2} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo || !hasProject}
          aria-label={canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'}
          title={canRedo ? `Redo: ${redoLabel} (Ctrl Shift Z)` : 'Nothing to redo'}
          id="nav-redo"
        >
          <Redo2 size={16} strokeWidth={2} />
        </Button>

        {/* Divider */}
        <div
          aria-hidden="true"
          style={{ width: '1px', height: '20px', background: 'var(--color-border)', flexShrink: 0 }}
        />

        {/* Save — shows dot indicator when unsaved */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { void onSave(); }}
          disabled={!hasProject}
          aria-label={isUnsaved ? 'Save project (unsaved changes)' : 'Save project'}
          title={isUnsaved ? 'Save project — unsaved changes (Ctrl S)' : 'Project saved (Ctrl S)'}
          id="nav-save"
          style={{ position: 'relative' }}
        >
          <Save size={16} strokeWidth={2} />
          {isUnsaved && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-warning, #F59E0B)',
                border: '1.5px solid var(--color-surface)',
              }}
            />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<FolderOpen size={15} strokeWidth={2} />}
          onClick={onOpenProjects}
          aria-label="Recent projects"
          id="nav-recent-projects"
        >
          Projects
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          aria-label="Settings"
          id="nav-settings"
          title="Settings"
        >
          <Settings size={16} strokeWidth={2} />
        </Button>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Download size={15} strokeWidth={2} />}
          style={{ paddingLeft: '24px', paddingRight: '24px', flexShrink: 0 }}
          onClick={onExport}
          disabled={!hasProject}
          aria-label="Export image"
          id="nav-export"
        >
          Export
        </Button>
      </nav>
    </header>
  );
}

// --------------------------------------------------------------------------
// Status Badge
// --------------------------------------------------------------------------

function StatusBadge({ status }: { status?: ProjectStatus }) {
  if (!status || status === 'empty' || status === 'saved') return null;

  const label = status === 'unsaved' ? 'Unsaved' : 'Loaded';
  const color = status === 'unsaved' ? 'var(--color-warning)' : 'var(--color-success)';

  return (
    <span
      style={{
        fontSize: '10px',
        color,
        fontWeight: 500,
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        background: status === 'unsaved' ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
        border: `1px solid ${color}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
