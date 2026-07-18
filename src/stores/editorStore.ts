import { create, type StoreApi } from 'zustand';
import { devtools } from 'zustand/middleware';
import { temporal, type TemporalState } from 'zundo';
import { generateId } from '@/utils/image';
import {
  type Project,
  type OriginalImage,
  type EditingState,
  type BackgroundState,
  type CropState,
  type EnhancementState,
  type ActiveTool,
  type DialogType,
  type ProcessingState,
  type ToastMessage,
  type UserPreferences,
  DEFAULT_ENHANCEMENT,
  DEFAULT_PREFERENCES,
} from '@/types';

// --------------------------------------------------------------------------
// Default State Factories
// --------------------------------------------------------------------------

function createDefaultBackgroundState(): BackgroundState {
  return {
    isRemoved: false,
    maskDataUrl: null,
    replacementColor: null,
    isProcessing: false,
    processingProgress: 0,
    error: null,
  };
}

function createDefaultCropState(): CropState {
  return {
    isActive: false,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zoom: 1,
    aspect: undefined,
    preset: null,
    flipHorizontal: false,
    flipVertical: false,
  };
}

function createDefaultEditingState(): EditingState {
  return {
    background: createDefaultBackgroundState(),
    crop: createDefaultCropState(),
    enhancement: { ...DEFAULT_ENHANCEMENT },
    previewMode: 'normal',
  };
}

// --------------------------------------------------------------------------
// Editor Store
// --------------------------------------------------------------------------

interface EditorStore {
  // Project State
  project: Project | null;
  activeTool: ActiveTool;
  activeDialog: DialogType;

  // UI State
  processingState: ProcessingState;
  toasts: ToastMessage[];
  preferences: UserPreferences;

  // Project Actions
  createProject: (image: OriginalImage) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;

  // Tool Actions
  setActiveTool: (tool: ActiveTool) => void;
  setActiveDialog: (dialog: DialogType) => void;

  // Background Actions
  setBackgroundProcessing: (isProcessing: boolean, progress?: number) => void;
  setBackgroundRemoved: (maskDataUrl: string) => void;
  setBackgroundColor: (color: string | null) => void;
  setBackgroundError: (error: string | null) => void;
  resetBackground: () => void;

  // Crop Actions
  updateCrop: (crop: Partial<CropState>) => void;
  resetCrop: () => void;

  // Enhancement Actions
  updateEnhancement: (enhancement: Partial<EnhancementState>) => void;
  resetEnhancement: () => void;

  // Preview Actions
  toggleComparisonMode: () => void;

  // Processing Actions
  setProcessing: (state: Partial<ProcessingState>) => void;

  // Toast Actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Preference Actions
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  addRecentBackgroundColor: (color: string) => void;
}

export const useEditorStore = create<EditorStore>()(
  devtools(
    temporal(
      (set, get) => ({
        // ---------- Initial State ----------
        project: null,
        activeTool: null,
        activeDialog: null,
        processingState: {
          status: 'idle',
          progress: 0,
          message: '',
          error: null,
        },
        toasts: [],
        preferences: { ...DEFAULT_PREFERENCES },

        // ---------- Project Actions ----------
        createProject: (image) => {
          const project: Project = {
            id: generateId(),
            name: image.name.replace(/\.[^.]+$/, ''),
            status: 'loaded',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            originalImage: image,
            editingState: createDefaultEditingState(),
          };
          set({ project, activeTool: null }, false, 'createProject');
        },

        closeProject: () => {
          set({ project: null, activeTool: null }, false, 'closeProject');
        },

        updateProjectName: (name) => {
          const { project } = get();
          if (!project) return;
          set(
            { project: { ...project, name, status: 'unsaved', updatedAt: Date.now() } },
            false,
            'updateProjectName'
          );
        },

        // ---------- Tool Actions ----------
        setActiveTool: (tool) => set({ activeTool: tool }, false, 'setActiveTool'),
        setActiveDialog: (dialog) => set({ activeDialog: dialog }, false, 'setActiveDialog'),

        // ---------- Background Actions ----------
        setBackgroundProcessing: (isProcessing, progress = 0) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                editingState: {
                  ...project.editingState,
                  background: {
                    ...project.editingState.background,
                    isProcessing,
                    processingProgress: progress,
                    error: null,
                  },
                },
              },
            },
            false,
            'setBackgroundProcessing'
          );
        },

        setBackgroundRemoved: (maskDataUrl) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  background: {
                    isRemoved: true,
                    maskDataUrl,
                    replacementColor: project.editingState.background.replacementColor,
                    isProcessing: false,
                    processingProgress: 100,
                    error: null,
                  },
                },
              },
            },
            false,
            'setBackgroundRemoved'
          );
        },

        setBackgroundColor: (color) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  background: {
                    ...project.editingState.background,
                    replacementColor: color,
                  },
                },
              },
            },
            false,
            'setBackgroundColor'
          );
        },

        setBackgroundError: (error) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                editingState: {
                  ...project.editingState,
                  background: {
                    ...project.editingState.background,
                    isProcessing: false,
                    error,
                  },
                },
              },
            },
            false,
            'setBackgroundError'
          );
        },

        resetBackground: () => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  background: createDefaultBackgroundState(),
                },
              },
            },
            false,
            'resetBackground'
          );
        },

        // ---------- Crop Actions ----------
        updateCrop: (crop) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  crop: { ...project.editingState.crop, ...crop },
                },
              },
            },
            false,
            'updateCrop'
          );
        },

        resetCrop: () => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  crop: createDefaultCropState(),
                },
              },
            },
            false,
            'resetCrop'
          );
        },

        // ---------- Enhancement Actions ----------
        updateEnhancement: (enhancement) => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  enhancement: { ...project.editingState.enhancement, ...enhancement },
                },
              },
            },
            false,
            'updateEnhancement'
          );
        },

        resetEnhancement: () => {
          const { project } = get();
          if (!project) return;
          set(
            {
              project: {
                ...project,
                status: 'unsaved',
                updatedAt: Date.now(),
                editingState: {
                  ...project.editingState,
                  enhancement: { ...DEFAULT_ENHANCEMENT },
                },
              },
            },
            false,
            'resetEnhancement'
          );
        },

        // ---------- Preview Actions ----------
        toggleComparisonMode: () => {
          const { project } = get();
          if (!project) return;
          const current = project.editingState.previewMode;
          set(
            {
              project: {
                ...project,
                editingState: {
                  ...project.editingState,
                  previewMode: current === 'normal' ? 'comparison' : 'normal',
                },
              },
            },
            false,
            'toggleComparisonMode'
          );
        },

        // ---------- Processing Actions ----------
        setProcessing: (state: Partial<ProcessingState>) => {
          set(
            (prev: EditorStore) => ({ processingState: { ...prev.processingState, ...state } }),
            false,
            'setProcessing'
          );
        },

        // ---------- Toast Actions ----------
        addToast: (toast: Omit<ToastMessage, 'id'>) => {
          const id = generateId();
          set(
            (prev: EditorStore) => ({ toasts: [...prev.toasts, { ...toast, id }] }),
            false,
            'addToast'
          );
        },

        removeToast: (id: string) => {
          set(
            (prev: EditorStore) => ({ toasts: prev.toasts.filter((t: ToastMessage) => t.id !== id) }),
            false,
            'removeToast'
          );
        },

        // ---------- Preference Actions ----------
        updatePreferences: (prefs: Partial<UserPreferences>) => {
          set(
            (prev: EditorStore) => ({ preferences: { ...prev.preferences, ...prefs } }),
            false,
            'updatePreferences'
          );
        },

        addRecentBackgroundColor: (color: string) => {
          set(
            (prev: EditorStore) => {
              const current = prev.preferences.recentBackgroundColors || [];
              const filtered = current.filter(c => c.toLowerCase() !== color.toLowerCase());
              return {
                preferences: {
                  ...prev.preferences,
                  recentBackgroundColors: [color, ...filtered].slice(0, 5)
                }
              };
            },
            false,
            'addRecentBackgroundColor'
          );
        },
      }),
      {
        partialize: (state: EditorStore) => ({ project: state.project }),
        limit: 50,
      }
    ),
    { name: 'EditorStore' }
  )
);

export const useHistoryStore = () => 
  (useEditorStore as unknown as { temporal: StoreApi<TemporalState<{ project: Project | null }>> }).temporal;

// Selector hooks for optimized subscriptions
export const useProject = () => useEditorStore((s) => s.project);
export const useActiveTool = () => useEditorStore((s) => s.activeTool);
export const useActiveDialog = () => useEditorStore((s) => s.activeDialog);
export const useToasts = () => useEditorStore((s) => s.toasts);
export const usePreferences = () => useEditorStore((s) => s.preferences);
export const useEditingState = () => useEditorStore((s) => s.project?.editingState ?? null);
export const useBackgroundState = () =>
  useEditorStore((s) => s.project?.editingState.background ?? null);
export const useEnhancementState = () =>
  useEditorStore((s) => s.project?.editingState.enhancement ?? null);
export const useCropState = () => useEditorStore((s) => s.project?.editingState.crop ?? null);
