import { removeBackground as imglyRemoveBackground, type Config } from '@imgly/background-removal';
import { EdgeRefinementEngine } from '../core/processing/EdgeRefinementEngine';

interface WorkerMessageData {
  id: number;
  type: 'REMOVE_BACKGROUND';
  payload: {
    imageBlob: Blob;
    modelVariant?: 'isnet' | 'isnet_fp16' | 'isnet_quint8';
    /** When re-processing, the previous mask result is sent for merge-based refinement */
    previousMaskBlob?: Blob | null;
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessageData>) => {
  const { id, type, payload } = event.data;

  if (type === 'REMOVE_BACKGROUND') {
    try {
      const { imageBlob, modelVariant, previousMaskBlob } = payload;
      const targetModel = modelVariant || 'isnet';

      // ── Step 1: Run AI Model Execution (GPU with CPU Fallback) ─────────
      let rawResultBlob: Blob;
      try {
        const configGpu: Config = {
          model: targetModel,
          device: 'gpu',
          rescale: true,
          fetchArgs: { cache: 'default' },
          output: { quality: 1.0, format: 'image/png' },
          progress: (key, current, total) => {
            if (total > 0 && key.includes('compute')) {
              self.postMessage({ id, type: 'PROGRESS', payload: { current, total } });
            }
          },
        };
        rawResultBlob = await imglyRemoveBackground(imageBlob, configGpu);
      } catch (gpuErr) {
        console.warn('[bgRemovalWorker] WebGPU inference failed, retrying on CPU WASM:', gpuErr);
        const configCpu: Config = {
          model: targetModel,
          device: 'cpu',
          rescale: true,
          fetchArgs: { cache: 'default' },
          output: { quality: 1.0, format: 'image/png' },
          progress: (key, current, total) => {
            if (total > 0 && key.includes('compute')) {
              self.postMessage({ id, type: 'PROGRESS', payload: { current, total } });
            }
          },
        };
        rawResultBlob = await imglyRemoveBackground(imageBlob, configCpu);
      }

      self.postMessage({ id, type: 'PROGRESS', payload: { current: 80, total: 100 } });

      // ── Step 2: Handle Reprocessing / Mask Blending ────────────────────
      let targetMaskBlob = rawResultBlob;
      if (previousMaskBlob) {
        targetMaskBlob = await mergeWithPreviousMask(rawResultBlob, previousMaskBlob);
      }

      self.postMessage({ id, type: 'PROGRESS', payload: { current: 90, total: 100 } });

      // ── Step 3: Local Window Matting & Edge Refinement (Inside Worker) ──
      // All heavy canvas/pixel loops run 100% off the main thread.
      const refinedDataUrl = await EdgeRefinementEngine.refineMask(imageBlob, targetMaskBlob, {
        contrastSensitivity: 1.0,
        spillSuppression: 80,
        featherRadius: 1,
      });

      // Convert refined data URL back to Blob for sending
      const finalResp = await fetch(refinedDataUrl);
      const refinedBlob = await finalResp.blob();

      self.postMessage({ id, type: 'PROGRESS', payload: { current: 100, total: 100 } });

      self.postMessage({
        id,
        type: 'SUCCESS',
        payload: { resultBlob: refinedBlob }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Worker failed to remove background';
      console.error('[bgRemovalWorker Error]', errorMessage);
      self.postMessage({
        id,
        type: 'ERROR',
        payload: { error: errorMessage }
      });
    }
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Re-Processing Mask Blending — Evaluates previous vs new model predictions
// ────────────────────────────────────────────────────────────────────────────

async function mergeWithPreviousMask(
  newMaskBlob: Blob,
  previousMaskBlob: Blob
): Promise<Blob> {
  let newBitmap: ImageBitmap | null = null;
  let prevBitmap: ImageBitmap | null = null;

  try {
    [newBitmap, prevBitmap] = await Promise.all([
      createImageBitmap(newMaskBlob),
      createImageBitmap(previousMaskBlob),
    ]);

    const w = newBitmap.width;
    const h = newBitmap.height;

    const mergeCanvas = new OffscreenCanvas(w, h);
    const mergeCtx = mergeCanvas.getContext('2d', { willReadFrequently: true });
    if (!mergeCtx) return newMaskBlob;

    mergeCtx.drawImage(newBitmap, 0, 0);
    const newData = mergeCtx.getImageData(0, 0, w, h);

    const prevCanvas = new OffscreenCanvas(w, h);
    const prevCtx = prevCanvas.getContext('2d', { willReadFrequently: true });
    if (!prevCtx) return newMaskBlob;

    prevCtx.drawImage(prevBitmap, 0, 0, w, h);
    const prevData = prevCtx.getImageData(0, 0, w, h);

    const nd = newData.data;
    const pd = prevData.data;

    // Blend: Keep high confidence subject regions from either mask,
    // but allow clear background decisions to resolve residue.
    for (let i = 0; i < nd.length; i += 4) {
      const newA = nd[i + 3];
      const prevA = pd[i + 3];

      // If previous mask had manual brush edits or strong foreground (prevA > 230 and newA > 30), preserve it
      if (prevA > 230 && newA > 30) {
        nd[i] = pd[i];
        nd[i + 1] = pd[i + 1];
        nd[i + 2] = pd[i + 2];
        nd[i + 3] = prevA;
      }
      // If both model runs agree on edge region (50..220), average them to smooth out model noise
      else if (newA > 30 && prevA > 30 && newA < 230 && prevA < 230) {
        nd[i + 3] = Math.round((newA + prevA) / 2);
      }
      // Otherwise keep new model prediction (allows eliminating residue when model improves)
    }

    mergeCtx.putImageData(newData, 0, 0);
    return await mergeCanvas.convertToBlob({ type: 'image/png' });

  } catch (err) {
    console.warn('[mergeWithPreviousMask] Fallback to new mask blob:', err);
    return newMaskBlob;
  } finally {
    if (newBitmap) newBitmap.close();
    if (prevBitmap) prevBitmap.close();
  }
}
