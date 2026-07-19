import { removeBackground, type Config } from '@imgly/background-removal';

interface WorkerMessageData {
  id: number;
  type: 'REMOVE_BACKGROUND';
  payload: { imageBlob: Blob };
}

// Listen for messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessageData>) => {
  const { id, type, payload } = event.data;

  if (type === 'REMOVE_BACKGROUND') {
    try {
      const { imageBlob } = payload;
      
      const config: Config = {
        progress: (_key: string, current: number, total: number) => {
          if (total > 0) {
            // Send progress back to main thread
            self.postMessage({
              id,
              type: 'PROGRESS',
              payload: { current, total }
            });
          }
        },
      };

      // Perform the heavy background removal on this worker thread
      const resultBlob = await removeBackground(imageBlob, config);

      self.postMessage({
        id,
        type: 'SUCCESS',
        payload: { resultBlob }
      });
    } catch (error) {
      self.postMessage({
        id,
        type: 'ERROR',
        payload: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }
};
