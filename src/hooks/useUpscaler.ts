// useUpscaler Hook — 2x AI Upscaling using upscaler and @tensorflow/tfjs
// Main thread async execution + high-quality 2x canvas fallback guarantee

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type UpscaleStatus = 'idle' | 'processing' | 'error';

// Singleton Upscaler instance to save memory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let upscalerInstance: any = null;

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
    setProgress(10);

    const inputDataUrl = currentProject.originalImage.dataUrl;

    let upscaledDataUrl = '';

    try {
      // 1. Try AI Super-Resolution via UpscalerJS + TFJS
      setProgress(20);
      const [{ default: Upscaler }, tf] = await Promise.all([
        import('upscaler'),
        import('@tensorflow/tfjs'),
      ]);

      await tf.ready();
      setProgress(35);

      if (!upscalerInstance) {
        upscalerInstance = new Upscaler();
      }

      setProgress(45);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await upscalerInstance.upscale(inputDataUrl, {
        patchSize: 64,
        padding: 2,
        progress: (pct: number) => {
          setProgress(Math.round(45 + pct * 45));
        },
      });

      upscaledDataUrl = String(result);
    } catch (aiErr) {
      console.warn('[useUpscaler] AI Upscaler failed/unavailable, falling back to High-Quality 2x Canvas Resampling:', aiErr);
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
