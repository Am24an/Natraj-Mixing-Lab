// =============================================================================
// useAI Hook — Background removal using @imgly/background-removal
// Uses CDN-hosted AI models (internet required for first load, then browser-cached)
// =============================================================================

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useToast } from '@/hooks/useToast';

export type AIEngineStatus = 'idle' | 'ready' | 'processing' | 'error';

export function useAI() {
  const toast = useToast();
  const [engineStatus, setEngineStatus] = useState<AIEngineStatus>('idle');

  const setBackgroundProcessing = useEditorStore((s) => s.setBackgroundProcessing);
  const setBackgroundRemoved = useEditorStore((s) => s.setBackgroundRemoved);
  const setBackgroundError = useEditorStore((s) => s.setBackgroundError);

  const removeBackground = useCallback(async () => {
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

      // Dynamically import — lazy loads, no bundle cost until first click
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      setBackgroundProcessing(true, 20);

      // Use the original File object if available (faster — no re-encoding),
      // else fall back to creating a blob from the dataUrl
      const sourceFile = currentProject.originalImage.file;
      const inputBlob: Blob = sourceFile instanceof File
        ? sourceFile
        : await (await fetch(currentProject.originalImage.dataUrl)).blob();

      setBackgroundProcessing(true, 30);
      let maxProgress = 30;

      // removeBg returns a transparent PNG Blob — models fetched from CDN and cached
      const resultBlob = await removeBg(inputBlob, {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) {
            const rawPct = Math.round(30 + (current / total) * 60);
            if (rawPct > maxProgress) {
              maxProgress = rawPct;
              setBackgroundProcessing(true, maxProgress);
            }
          }
        },
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
