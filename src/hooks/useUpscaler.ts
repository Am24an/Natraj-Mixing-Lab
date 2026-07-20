// useUpscaler Hook — 2x AI Upscaling using upscaler and @tensorflow/tfjs
// Offloaded to a Web Worker to prevent main thread blocking!

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type UpscaleStatus = 'idle' | 'processing' | 'error';

// Singleton worker to preserve the TFJS model in memory across panel switches
let globalUpscaleWorker: Worker | null = null;

function getUpscaleWorker(): Worker {
  if (!globalUpscaleWorker) {
    globalUpscaleWorker = new Worker(
      new URL('../workers/upscaleWorker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return globalUpscaleWorker;
}

export function useUpscaler() {
  const toast = useToast();
  const [status, setStatus] = useState<UpscaleStatus>('idle');
  const [progress, setProgress] = useState(0);

  const upscaleImage = useCallback(async () => {
    const currentProject = useEditorStore.getState().project;

    if (!currentProject?.originalImage) {
      toast.error('No image loaded', 'Please upload a photo first.');
      return;
    }

    if (status === 'processing') {
      toast.warning('Already processing', 'Please wait for the current job to finish.');
      return;
    }

    const worker = getUpscaleWorker();

    setStatus('processing');
    setProgress(5);

    // Promise wrapper for the worker message
    try {
      const upscaledDataUrl = await new Promise<string>((resolve, reject) => {
        const handleMessage = (e: MessageEvent) => {
          const data = e.data as { type: string; payload: Record<string, unknown> };
          const { type, payload } = data;
          if (type === 'PROGRESS') {
            setProgress(Number(payload.progress));
          } else if (type === 'SUCCESS') {
            worker.removeEventListener('message', handleMessage);
            resolve(String(payload.dataUrl));
          } else if (type === 'ERROR') {
            worker.removeEventListener('message', handleMessage);
            reject(new Error(String(payload.error)));
          }
        };

        worker.addEventListener('message', handleMessage);
        
        // Start the worker
        worker.postMessage({
          type: 'START_UPSCALE',
          payload: { dataUrl: currentProject.originalImage!.dataUrl }
        });
      });

      setProgress(95);

      const img = new Image();
      img.src = upscaledDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load upscaled image'));
      });

      // Update the original image directly in the store
      useEditorStore.setState((prev) => {
        if (!prev.project || !prev.project.originalImage) return prev;
        return {
          project: {
            ...prev.project,
            originalImageBeforeUpscale: prev.project.originalImage.dataUrl,
            originalImage: {
              ...prev.project.originalImage,
              dataUrl: upscaledDataUrl,
              dimensions: {
                width: img.naturalWidth,
                height: img.naturalHeight,
              },
            },
            updatedAt: Date.now(),
          },
        };
      });

      setStatus('idle');
      setProgress(0);
      toast.success('Upscale Complete', 'Your image is now 2x resolution in HD!');
    } catch (err) {
      console.error('[useUpscaler] Error:', err);
      setStatus('error');
      setProgress(0);
      toast.error('Upscale Failed', 'An error occurred during upscaling.');
    }
  }, [status, toast]);

  return {
    status,
    progress,
    upscaleImage,
  };
}
