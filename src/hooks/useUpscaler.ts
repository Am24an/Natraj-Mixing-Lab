// useUpscaler Hook — 2x AI Upscaling using upscaler and @tensorflow/tfjs
// Main thread async execution + high-quality 2x canvas fallback guarantee

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type UpscaleStatus = 'idle' | 'processing' | 'error';

// Singleton Web Worker instance for TFJS Upscaler
let upscaleWorkerSingleton: Worker | null = null;

function getOrCreateUpscaleWorker(): Worker {
  if (!upscaleWorkerSingleton) {
    upscaleWorkerSingleton = new Worker(
      new URL('../workers/upscaleWorker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return upscaleWorkerSingleton;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
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

    setStatus('processing');
    setProgress(5);

    const inputDataUrl = currentProject.originalImage.dataUrl;
    let upscaledDataUrl = '';

    try {
      // 1. AI Super-Resolution via dedicated Web Worker (prevents main thread freeze)
      const worker = getOrCreateUpscaleWorker();

      upscaledDataUrl = await new Promise<string>((resolve, reject) => {
        const handleMessage = (e: MessageEvent<{ type: string; payload: Record<string, unknown> }>) => {
          const { type, payload } = e.data;
          if (type === 'PROGRESS') {
            setProgress(Number(payload.progress));
          } else if (type === 'SUCCESS') {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            resolve(String(payload.dataUrl));
          } else if (type === 'ERROR') {
            worker.removeEventListener('message', handleMessage);
            worker.removeEventListener('error', handleError);
            reject(new Error(String(payload.error)));
          }
        };

        const handleError = (err: ErrorEvent) => {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          reject(new Error(err.message || 'Worker upscale failed'));
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);

        worker.postMessage({
          type: 'START_UPSCALE',
          payload: { dataUrl: inputDataUrl },
        });
      });
    } catch (aiErr) {
      console.warn('[useUpscaler] Worker AI Upscaler failed/unavailable, falling back to High-Quality 2x Canvas Resampling:', aiErr);
      setProgress(60);

      // 2. High-Quality 2x Canvas Rescaling Fallback Guarantee
      try {
        const img = await loadImage(inputDataUrl);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth * 2;
        canvas.height = img.naturalHeight * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          upscaledDataUrl = canvas.toDataURL('image/png');
        } else {
          throw new Error('Canvas 2D context unavailable');
        }
      } catch (fallbackErr) {
        console.error('[useUpscaler] Fallback failed:', fallbackErr);
        setStatus('error');
        setProgress(0);
        toast.error('Upscale Failed', 'Unable to upscale this image.');
        return;
      }
    }

    setProgress(95);

    try {
      const img = await loadImage(upscaledDataUrl);

      // Update original image directly in editor store
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
      console.error('[useUpscaler] Store update error:', err);
      setStatus('error');
      setProgress(0);
      toast.error('Upscale Failed', 'Could not apply upscaled image.');
    }
  }, [status, toast]);

  return {
    status,
    progress,
    upscaleImage,
  };
}
