
// useAI Hook — Background removal using @imgly/background-removal & Web Worker
// Performs 100% of AI inference and pixel-level matting in dedicated Web Worker
// to preserve main UI thread 60fps responsiveness.

import { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';
import { analyzeMaskQuality } from '@/core/processing/MaskQualityAnalyzer';
import type { BgRemovalQuality } from '@/types';

export type AIEngineStatus = 'idle' | 'ready' | 'processing' | 'error';

// Eagerly create the singleton worker on module load.
let bgWorker: Worker | null = null;
function getOrCreateWorker(): Worker {
  if (!bgWorker) {
    bgWorker = new Worker(new URL('../workers/bgRemovalWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return bgWorker;
}

if (typeof window !== 'undefined') {
  getOrCreateWorker();
}

let jobIdCounter = 0;

type WorkerResponseData =
  | { id: number; type: 'PROGRESS'; payload: { current: number; total: number } }
  | { id: number; type: 'SUCCESS'; payload: { resultBlob: Blob } }
  | { id: number; type: 'ERROR'; payload: { error: string } };

export function useAI() {
  const toast = useToast();
  const [engineStatus, setEngineStatus] = useState<AIEngineStatus>('idle');

  // Use ref to track status safely without stale closures
  const statusRef = useRef<AIEngineStatus>('idle');
  statusRef.current = engineStatus;

  const setBackgroundProcessing = useEditorStore((s) => s.setBackgroundProcessing);
  const setBackgroundRemoved = useEditorStore((s) => s.setBackgroundRemoved);
  const setBackgroundError = useEditorStore((s) => s.setBackgroundError);

  const removeBackground = useCallback(async (modelVariant?: 'isnet' | 'isnet_fp16' | 'isnet_quint8') => {
    const currentProject = useEditorStore.getState().project;

    if (!currentProject?.originalImage) {
      toast.error('No image loaded', 'Please upload a photo first.');
      return;
    }

    if (statusRef.current === 'processing') {
      toast.warning('Already processing', 'Please wait for the current job to finish.');
      return;
    }

    try {
      setEngineStatus('processing');
      statusRef.current = 'processing';
      setBackgroundProcessing(true, 10);

      const worker = getOrCreateWorker();

      const sourceFile = currentProject.originalImage.file;
      const inputBlob: Blob = sourceFile instanceof File
        ? sourceFile
        : await (await fetch(currentProject.originalImage.dataUrl)).blob();

      // Check if re-processing (send previous mask to worker if available)
      const background = currentProject.editingState.background;
      let previousMaskBlob: Blob | null = null;
      if (background.isRemoved && background.maskDataUrl) {
        try {
          const resp = await fetch(background.maskDataUrl);
          previousMaskBlob = await resp.blob();
        } catch {
          previousMaskBlob = null;
        }
      }

      setBackgroundProcessing(true, 25);
      let maxProgress = 25;

      const jobId = ++jobIdCounter;

      const resultBlob = await new Promise<Blob>((resolve, reject) => {
        const handleError = (error: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(error.message || 'Worker failed'));
        };

        const handleMessage = (event: MessageEvent<WorkerResponseData>) => {
          const data = event.data;
          if (data.id !== jobId) return;

          if (data.type === 'PROGRESS') {
            const { current, total } = data.payload;
            if (total > 0) {
              const rawPct = Math.round(25 + (current / total) * 70);
              if (rawPct > maxProgress) {
                maxProgress = rawPct;
                setBackgroundProcessing(true, maxProgress);
              }
            }
          } else if (data.type === 'SUCCESS') {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            resolve(data.payload.resultBlob);
          } else if (data.type === 'ERROR') {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            reject(new Error(data.payload.error));
          }
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({
          id: jobId,
          type: 'REMOVE_BACKGROUND',
          payload: { imageBlob: inputBlob, modelVariant, previousMaskBlob }
        });
      });

      setBackgroundProcessing(true, 98);

      // Read resultBlob into data URL off main thread (fast FileReader conversion)
      const resultDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read result blob'));
        reader.readAsDataURL(resultBlob);
      });

      setBackgroundProcessing(true, 100);
      setBackgroundRemoved(resultDataUrl);
      setEngineStatus('ready');
      statusRef.current = 'ready';

      const isReprocess = previousMaskBlob !== null;
      toast.success(
        isReprocess ? 'Re-processed with enhanced refinement!' : 'Background removed!',
        isReprocess
          ? 'Refined boundaries for hair, ears, nose & ornaments.'
          : 'Subject extracted cleanly with local matting.'
      );

      // Async quality scoring (non-blocking)
      void runQualityAnalysis(resultDataUrl);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setEngineStatus('error');
      statusRef.current = 'error';
      setBackgroundError(msg);
      toast.error('Background removal failed', msg);
    }
  }, [setBackgroundProcessing, setBackgroundRemoved, setBackgroundError, toast]);

  return { removeBackground, engineStatus };
}

async function runQualityAnalysis(resultDataUrl: string): Promise<void> {
  try {
    const quality = await analyzeMaskQuality(resultDataUrl);

    const prev = useEditorStore.getState().preferences.workflowMemory;
    const history = [
      ...(prev?.bgRemovalHistory ?? []),
      {
        timestamp: Date.now(),
        qualityScore: quality.qualityScore,
        transparencyPct: quality.transparencyPct,
        neededManualCleanup: false,
        brushStrokesAfter: 0,
      } satisfies BgRemovalQuality,
    ].slice(-10);

    const avgScore = history.length > 0
      ? Math.round(history.reduce((s, h) => s + h.qualityScore, 0) / history.length)
      : quality.qualityScore;

    useEditorStore.getState().updateWorkflowMemory({
      bgRemovalHistory: history,
      avgBgQualityScore: avgScore,
      currentSessionBrushStrokes: 0,
    });

    if (quality.suggestMaskBrush) {
      const gradeMsg =
        quality.grade === 'Fair'
          ? `Edge quality: ${quality.grade} (${quality.qualityScore}/100). Some residue detected.`
          : `Edge quality: ${quality.grade} (${quality.qualityScore}/100). Manual touchup recommended.`;

      useEditorStore.getState().addToast({
        variant: 'warning',
        title: '✏️ Mask Brush suggested',
        description: `${gradeMsg} Switch to Mask Brush (M) to refine edges.`,
      });
    }
  } catch {
    // Non-blocking best effort
  }
}
