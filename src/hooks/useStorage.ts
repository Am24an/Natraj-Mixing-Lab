// useStorage Hook — React bindings for StorageEngine
// IndexedDB abstraction layer
//
// Design rules:
//   - Call ONCE at Workspace level only — never inside dialogs or child components
//   - saveCurrentProject is hoisted above the auto-save effect (no stale closure)
//   - Preference save is guarded on first render (load must resolve before save)

import { useEffect, useCallback, useRef } from 'react';
import { storageEngine } from '@/core/storage/StorageEngine';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';
import type { StoredProject } from '@/types';

const AUTO_SAVE_DELAY_MS = 3000; // 3 seconds debounce

export function useStorage() {
  const toast = useToast();
  const preferences = useEditorStore((s) => s.preferences);
  const updatePreferences = useEditorStore((s) => s.updatePreferences);
  const projectStatus = useEditorStore((s) => s.project?.status);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: prevents saving preferences before they've been loaded from IndexedDB
  const prefLoadedRef = useRef(false);

  useEffect(() => {
    storageEngine
      .getPreference<typeof preferences>('user-preferences')
      .then((saved) => {
        if (saved) updatePreferences(saved);
      })
      .catch((err) => console.warn('[useStorage] Failed to load preferences:', err))
      .finally(() => {
        prefLoadedRef.current = true;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!prefLoadedRef.current) return; // skip the initial render before load resolves
    storageEngine
      .savePreference('user-preferences', preferences)
      .catch((err) => console.warn('[useStorage] Failed to save preferences:', err));
  }, [preferences]);

  const saveCurrentProject = useCallback(async (): Promise<void> => {
    const current = useEditorStore.getState().project;
    if (!current || !current.originalImage) return;

    const stored: StoredProject = {
      id: current.id,
      name: current.name,
      // thumbnailUrl: populated during Export Engine canvas snapshot
      thumbnailUrl: current.thumbnailUrl ?? '',
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
      editingStateJson: JSON.stringify(current.editingState),
    };

    await storageEngine.saveProject(stored);

    useEditorStore.setState((state) => ({
      project: state.project ? { ...state.project, status: 'saved' } : null,
    }));
  }, []);

  useEffect(() => {
    const { project } = useEditorStore.getState();
    if (!project || !preferences.autoSave) return;
    if (project.status !== 'unsaved') return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          await saveCurrentProject();
        } catch (err) {
          console.warn('[useStorage] Auto-save failed:', err);
        }
      })();
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [saveCurrentProject, preferences.autoSave, projectStatus]);
  // Note: we read project via getState() inside the timer callback — always fresh


  const loadAllProjects = useCallback(
    (): Promise<StoredProject[]> => storageEngine.getAllProjects(),
    []
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await storageEngine.deleteProject(id);
      toast.success('Project deleted');
    },
    [toast]
  );

  const saveManually = useCallback(async (): Promise<void> => {
    try {
      await saveCurrentProject();
      toast.success('Project saved');
    } catch {
      toast.error('Save failed', 'Could not save the project. Please try again.');
    }
  }, [saveCurrentProject, toast]);

  return { saveManually, loadAllProjects, deleteProject };
}
