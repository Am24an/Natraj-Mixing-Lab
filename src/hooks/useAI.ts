
// useAI Hook — Background removal using @imgly/background-removal
// Uses a persistent Web Worker to prevent UI blocking and cache the model.

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type AIEngineStatus = 'idle' | 'ready' | 'processing' | 'error';

// Eagerly create the singleton worker on module load.
// This pre-warms the model cache: the browser starts downloading/caching the
// WASM model files in the background as soon as the app opens, so by the time
// the user clicks "Remove Background" the model is already warm.
let bgWorker: Worker | null = null;
function getOrCreateWorker(): Worker {
  if (!bgWorker) {
    bgWorker = new Worker(new URL('../workers/bgRemovalWorker.ts', import.meta.url), {
      type: 'module',
    });
  }
  return bgWorker;
}
// Pre-warm on module import (lazy — only runs when useAI is first imported)
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

  const setBackgroundProcessing = useEditorStore((s) => s.setBackgroundProcessing);
  const setBackgroundRemoved = useEditorStore((s) => s.setBackgroundRemoved);
  const setBackgroundError = useEditorStore((s) => s.setBackgroundError);

  const removeBackground = useCallback(async (modelVariant?: 'isnet' | 'isnet_fp16' | 'isnet_quint8') => {
    const currentProject = useEditorStore.getState().project;

    if (!currentProject?.originalImage) {
      toast.error('No image loaded', 'Please upload a photo first.');
      return;
    }

    if (engineStatus === 'processing') {
      toast.warning('Already processing', 'Please wait for the current job to finish.');
      return;
    }

    try {
      setEngineStatus('processing');
      setBackgroundProcessing(true, 10);

      setBackgroundProcessing(true, 20);

      // Use the pre-warmed worker singleton
      const worker = getOrCreateWorker();

      // Use the original File object if available (faster — no re-encoding),
      // else fall back to creating a blob from the dataUrl
      const sourceFile = currentProject.originalImage.file;
      const inputBlob: Blob = sourceFile instanceof File
        ? sourceFile
        : await (await fetch(currentProject.originalImage.dataUrl)).blob();

      setBackgroundProcessing(true, 30);
      let maxProgress = 30;

      const jobId = ++jobIdCounter;

      const resultBlob = await new Promise<Blob>((resolve, reject) => {
        const handleError = (error: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(error.message || 'Worker failed'));
        };

        const handleMessage = (event: MessageEvent<WorkerResponseData>) => {
          const data = event.data;
          
          if (data.id !== jobId) return; // Ignore messages from other jobs
          
          if (data.type === 'PROGRESS') {
            const { current, total } = data.payload;
            if (total > 0) {
              const rawPct = Math.round(30 + (current / total) * 60);
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
        
        // Post the blob to the worker
        worker.postMessage({
          id: jobId,
          type: 'REMOVE_BACKGROUND',
          payload: { imageBlob: inputBlob, modelVariant }
        });
      });

      setBackgroundProcessing(true, 95);

      // Convert to dataUrl for storage and canvas rendering
      const resultDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read result blob'));
        reader.readAsDataURL(resultBlob);
      });

      setBackgroundRemoved(resultDataUrl);
      setEngineStatus('ready');
      toast.success('Background removed!', 'Subject extracted cleanly.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setEngineStatus('error');
      setBackgroundError(msg);
      toast.error('Background removal failed', msg);
    }
  }, [engineStatus, setBackgroundProcessing, setBackgroundRemoved, setBackgroundError, toast]);

  return { removeBackground, engineStatus };
}
