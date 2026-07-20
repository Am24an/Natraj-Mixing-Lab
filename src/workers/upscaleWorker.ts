// src/workers/upscaleWorker.ts
/// <reference lib="webworker" />

// We use self as DedicatedWorkerGlobalScope
const ctx = self as unknown as DedicatedWorkerGlobalScope;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let upscalerInstance: any = null;

ctx.addEventListener('message', (event: MessageEvent) => {
  void (async () => {
    const data = event.data as { type: string; payload: Record<string, unknown> };
    const { type, payload } = data;

    if (type === 'START_UPSCALE') {
      const dataUrl = String(payload.dataUrl);
      
      try {
        ctx.postMessage({ type: 'PROGRESS', payload: { progress: 5 } });
        
        // Lazy load dependencies inside the worker to prevent initial blocking
        const [{ default: Upscaler }, tf] = await Promise.all([
          import('upscaler'),
          import('@tensorflow/tfjs')
        ]);

        // Ensure TF backend is initialized and ready
        await tf.ready();
        ctx.postMessage({ type: 'PROGRESS', payload: { progress: 20 } });

        if (!upscalerInstance) {
          // Only initialize once to save memory
          upscalerInstance = new Upscaler();
        }

        ctx.postMessage({ type: 'PROGRESS', payload: { progress: 30 } });

        // Run upscaler
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const upscaledDataUrl = await upscalerInstance.upscale(dataUrl, {
          patchSize: 64, // Prevents memory crashes on large images
          padding: 2,
          progress: (pct: number) => {
            // Progress from upscaler is between 0 and 1
            ctx.postMessage({ 
              type: 'PROGRESS', 
              payload: { progress: Math.round(30 + pct * 65) } 
            });
          }
        });

        // Send the resulting data URL back
        ctx.postMessage({ type: 'SUCCESS', payload: { dataUrl: String(upscaledDataUrl) } });

      } catch (error) {
        console.error('[upscaleWorker] Error:', error);
        ctx.postMessage({ 
          type: 'ERROR', 
          payload: { error: error instanceof Error ? error.message : 'Unknown error during upscaling' } 
        });
      }
    }
  })();
});

export {}; // Ensure this is treated as a module
