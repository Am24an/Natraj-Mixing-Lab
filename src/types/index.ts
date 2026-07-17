// =============================================================================
// Core Types — Natraj Mixing Lab Passport Photo Studio
// =============================================================================

// --------------------------------------------------------------------------
// Image & Project Types
// --------------------------------------------------------------------------

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OriginalImage {
  id: string;
  file: File;
  name: string;
  format: ImageFormat;
  mimeType: SupportedMimeType;
  size: number;
  dimensions: ImageDimensions;
  dataUrl: string;
  loadedAt: number;
}

export type ProjectStatus = 'empty' | 'loaded' | 'editing' | 'unsaved' | 'saved';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  thumbnailUrl?: string;
  originalImage: OriginalImage | null;
  originalImageBeforeUpscale?: string | null;
  editingState: EditingState;
}

// --------------------------------------------------------------------------
// Editing State Types
// --------------------------------------------------------------------------

export interface BackgroundState {
  isRemoved: boolean;
  maskDataUrl: string | null;
  replacementColor: string | null;
  isProcessing: boolean;
  processingProgress: number;
  error: string | null;
}

export interface CropState {
  isActive: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zoom: number;
  aspect: number | undefined; // undefined = freeform
  preset: CropPreset | null;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export type CropPreset =
  | '2x2'        // US Passport (2×2 inch)
  | '35x45'      // Indian Passport (35×45mm)
  | '35x45-eu'   // EU Standard (35×45mm)
  | '40x30'      // UK Standard (40×30mm)
  | '51x51'      // Australian (51×51mm)
  | 'square'     // Square
  | 'freeform';  // Free crop

export interface EnhancementState {
  brightness: number;   // -100 to 100, default 0
  contrast: number;     // -100 to 100, default 0
  saturation: number;   // -100 to 100, default 0
  sharpness: number;    // 0 to 100, default 0
  highlights: number;   // -100 to 100, default 0
  shadows: number;      // -100 to 100, default 0
}

export const DEFAULT_ENHANCEMENT: EnhancementState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  highlights: 0,
  shadows: 0,
};

export interface EditingState {
  background: BackgroundState;
  crop: CropState;
  enhancement: EnhancementState;
  previewMode: PreviewMode;
}

export type PreviewMode = 'normal' | 'comparison';

// --------------------------------------------------------------------------
// History / Undo-Redo Types
// --------------------------------------------------------------------------

export type EditingAction =
  | { type: 'BACKGROUND_REMOVED'; maskDataUrl: string }
  | { type: 'BACKGROUND_COLOR_SET'; color: string }
  | { type: 'BACKGROUND_RESET' }
  | { type: 'CROP_APPLIED'; cropState: CropState }
  | { type: 'CROP_RESET' }
  | { type: 'ENHANCEMENT_APPLIED'; enhancement: EnhancementState }
  | { type: 'ENHANCEMENT_RESET' };

export interface HistoryEntry {
  id: string;
  action: EditingAction;
  stateSnapshot: EditingState;
  timestamp: number;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
}

// --------------------------------------------------------------------------
// UI / Workspace Types
// --------------------------------------------------------------------------

export type ActiveTool =
  | 'background-removal'
  | 'background-color'
  | 'crop'
  | 'enhancement'
  | 'upscale'
  | 'comparison'
  | null;

export type DialogType =
  | 'export'
  | 'recent-projects'
  | 'settings'
  | 'delete-confirm'
  | 'new-project-confirm'
  | null;

export type Theme = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: Theme;
  lastExportFormat: ImageFormat;
  lastExportQuality: number;
  showStatusBar: boolean;
  autoSave: boolean;
  recentBackgroundColors: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  lastExportFormat: 'jpeg',
  lastExportQuality: 95,
  showStatusBar: true,
  autoSave: true,
  recentBackgroundColors: [],
};

// --------------------------------------------------------------------------
// Export Types
// --------------------------------------------------------------------------

export interface ExportOptions {
  format: ImageFormat;
  quality: number;         // 0–100
  dpi: number;             // 72, 96, 150, 300
  width?: number;          // Override width in px
  height?: number;         // Override height in px
  includeBackground: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'jpeg',
  quality: 95,
  dpi: 300,
  includeBackground: true,
};

// --------------------------------------------------------------------------
// Toast Notification Types
// --------------------------------------------------------------------------

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

// --------------------------------------------------------------------------
// Storage Types (IndexedDB)
// --------------------------------------------------------------------------

export interface StoredProject {
  id: string;
  name: string;
  thumbnailUrl: string;
  createdAt: number;
  updatedAt: number;
  editingStateJson: string;
}

// --------------------------------------------------------------------------
// Processing Types
// --------------------------------------------------------------------------

export type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'success' | 'error';

export interface ProcessingState {
  status: ProcessingStatus;
  progress: number;
  message: string;
  error: string | null;
}

// --------------------------------------------------------------------------
// Passport Color Presets
// --------------------------------------------------------------------------

export interface PassportColorPreset {
  id: string;
  name: string;
  color: string;
  description: string;
  countries?: string[];
}

export const PASSPORT_COLOR_PRESETS: PassportColorPreset[] = [
  { id: 'white', name: 'White', color: '#FFFFFF', description: 'Standard white background', countries: ['US', 'UK', 'CA'] },
  { id: 'light-blue', name: 'Light Blue', color: '#B8D4E8', description: 'Standard light blue', countries: ['IN', 'PK'] },
  { id: 'light-grey', name: 'Light Grey', color: '#E8E8E8', description: 'Neutral light grey', countries: ['AU', 'NZ'] },
  { id: 'cream', name: 'Cream', color: '#F5F0E8', description: 'Off-white / cream', countries: [] },
  { id: 'pale-blue', name: 'Pale Blue', color: '#DCE8F4', description: 'Very light blue', countries: ['EU'] },
  { id: 'off-white', name: 'Off White', color: '#F9F8F5', description: 'Warm off-white', countries: [] },
];
