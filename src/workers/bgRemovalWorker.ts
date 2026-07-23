import { removeBackground as imglyRemoveBackground, type Config } from '@imgly/background-removal';

interface WorkerMessageData {
  id: number;
  type: 'REMOVE_BACKGROUND';
  payload: { 
    imageBlob: Blob;
    modelVariant?: 'isnet' | 'isnet_fp16' | 'isnet_quint8';
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessageData>) => {
  const { id, type, payload } = event.data;

  if (type === 'REMOVE_BACKGROUND') {
    try {
      const { imageBlob, modelVariant } = payload;
      // Use full-precision 'isnet' model for dramatically better mask quality.
      // isnet_fp16 (half-precision) is faster but produces noticeably worse edges
      // on passport photos with complex hair/fur details.
      const targetModel = modelVariant || 'isnet';
      
      const config: Config = {
        model: targetModel,
        // Use 'default' cache strategy — the library manages its own IndexedDB model cache.
        // 'force-cache' can paradoxically cause re-downloads when browser cache is cold.
        fetchArgs: { cache: 'default' },
        output: {
          quality: 1.0,
          format: 'image/png',
        },
        progress: (key, current, total) => {
          if (total > 0 && key.includes('compute')) {
            self.postMessage({
              id,
              type: 'PROGRESS',
              payload: { current, total }
            });
          }
        },
      };

      // Run background removal exactly ONCE to prevent OOM errors and maximize speed
      const resultBlob = await imglyRemoveBackground(imageBlob, config);

      self.postMessage({
        id,
        type: 'SUCCESS',
        payload: { resultBlob }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Worker failed to remove background';
      console.error('[Worker Error]', errorMessage);
      self.postMessage({
        id,
        type: 'ERROR',
        payload: { error: errorMessage }
      });
    }
  }
};
