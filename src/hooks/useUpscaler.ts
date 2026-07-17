// =============================================================================
// useUpscaler Hook — 2x AI Upscaling using upscaler and @tensorflow/tfjs
// Lazy loaded to prevent main bundle bloat.
// =============================================================================

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type UpscaleStatus = 'idle' | 'processing' | 'error';

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

    try {
      setStatus('processing');
      setProgress(5);

      // Dynamically import to keep bundle small
      const [{ default: Upscaler }] = await Promise.all([
        import('upscaler'),
        import('@tensorflow/tfjs') // Import tfjs so it initializes
      ]);

      setProgress(20);

      const upscaler = new Upscaler();
      
      setProgress(30);
      
      const upscaledDataUrl = await upscaler.upscale(currentProject.originalImage.dataUrl, {
        patchSize: 64, // Prevents memory crashes on large images
        padding: 2,
        progress: (pct: number) => {
          setProgress(Math.round(30 + pct * 65));
        }
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
