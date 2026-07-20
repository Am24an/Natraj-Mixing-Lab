import { removeBackground as imglyRemoveBackground, type Config } from '@imgly/background-removal';

interface WorkerMessageData {
  id: number;
  type: 'REMOVE_BACKGROUND';
  payload: { 
    imageBlob: Blob;
    modelVariant?: 'auto' | 'isnet_quint8' | 'isnet';
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessageData>) => {
  const { id, type, payload } = event.data;

  if (type === 'REMOVE_BACKGROUND') {
    try {
      const { imageBlob, modelVariant } = payload;
      const targetModel = modelVariant === 'auto' ? 'isnet_fp16' : (modelVariant || 'isnet_fp16');
      
      const config: Config = {
        model: targetModel,
        // Aggressive caching: tell the browser to skip Etag validation and use local disk cache immediately
        fetchArgs: { cache: 'force-cache' },
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
