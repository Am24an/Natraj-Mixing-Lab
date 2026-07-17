import { lazy, Suspense } from 'react';
import { useProject, useActiveTool, useActiveDialog, useEditorStore } from '@/stores/editorStore';
import { TopNavigation } from './TopNavigation';
import { LeftToolbar } from './LeftToolbar';
import { EditingCanvas } from './EditingCanvas';
import { RightPanel } from './RightPanel';
import { useStorage } from '@/hooks/useStorage';
import type { DialogType, StoredProject } from '@/types';

// Dialogs are code-split — loaded only when first opened (lazy per SDEP)
const ExportDialog = lazy(() =>
  import('@/features/export/ExportDialog').then((m) => ({ default: m.ExportDialog }))
);
const RecentProjectsDialog = lazy(() =>
  import('@/features/projects/RecentProjectsDialog').then((m) => ({
    default: m.RecentProjectsDialog,
  }))
);
const SettingsDialog = lazy(() =>
  import('@/features/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog }))
);

/**
 * Workspace — The single persistent editing environment.
 *
 * Per CDVLS & UIIA: The workspace never changes structure.
 * Only the canvas content and right panel content change based on state.
 *
 * Layout:
 * ┌──────────────────────────────────────────────┐
 * │               Top Navigation                 │
 * ├──────────┬───────────────────────┬───────────┤
 * │          │                       │           │
 * │  Left    │   Editing Canvas      │  Right    │
 * │  Toolbar │                       │  Panel    │
 * │          │                       │           │
 * └──────────┴───────────────────────┴───────────┘
 */
export function Workspace() {
  const project = useProject();
  const activeTool = useActiveTool();
  const activeDialog = useActiveDialog();
  const setActiveDialog = useEditorStore((s) => s.setActiveDialog);

  // Mount storage layer — handles auto-save, preferences persistence
  const { saveManually, loadAllProjects, deleteProject } = useStorage();

  return (
    <div
      className="workspace-grid"
      style={{
        background: 'var(--color-background)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Navigation — spans full width */}
      <div className="mobile-nav" style={{ gridColumn: '1 / -1', gridRow: '1' }}>
        <TopNavigation
          projectName={project?.name}
          projectStatus={project?.status}
          onExport={() => setActiveDialog('export')}
          onOpenProjects={() => setActiveDialog('recent-projects')}
          onOpenSettings={() => setActiveDialog('settings')}
          onSave={saveManually}
        />
      </div>

      {/* Left Toolbar */}
      <div className="mobile-toolbar" style={{ gridColumn: '1', gridRow: '2', overflow: 'hidden' }}>
        <LeftToolbar hasProject={!!project} />
      </div>

      {/* Central Editing Canvas */}
      <div className="mobile-canvas" style={{ gridColumn: '2', gridRow: '2', overflow: 'hidden' }}>
        <EditingCanvas project={project} activeTool={activeTool} />
      </div>

      {/* Right Context Panel */}
      <div className="mobile-panel" style={{ gridColumn: '3', gridRow: '2', overflow: 'hidden' }}>
        <RightPanel activeTool={activeTool} hasProject={!!project} />
      </div>

      {/* Dialog Layer — renders over workspace */}
      {activeDialog && (
        <DialogLayer
          activeDialog={activeDialog}
          onClose={() => setActiveDialog(null)}
          loadAllProjects={loadAllProjects}
          deleteProject={deleteProject}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Dialog Layer — temporary overlays per CDVLS spec
// --------------------------------------------------------------------------

interface DialogLayerProps {
  activeDialog: Exclude<DialogType, null>;
  onClose: () => void;
  loadAllProjects: () => Promise<StoredProject[]>;
  deleteProject: (id: string) => Promise<void>;
}

function DialogLayer({ activeDialog, onClose, loadAllProjects, deleteProject }: DialogLayerProps) {
  return (
    <Suspense fallback={null}>
      {activeDialog === 'export' && <ExportDialog onClose={onClose} />}
      {activeDialog === 'recent-projects' && (
        <RecentProjectsDialog
          onClose={onClose}
          loadAllProjects={loadAllProjects}
          deleteProject={deleteProject}
        />
      )}
      {activeDialog === 'settings' && <SettingsDialog onClose={onClose} />}
    </Suspense>
  );
}
