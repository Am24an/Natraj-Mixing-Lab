import { describe, it, expect } from 'vitest';
import { EdgeRefinementEngine } from '../EdgeRefinementEngine';

describe('EdgeRefinementEngine', () => {
  it('should accept valid options and process raw mask blobs', async () => {
    // 1x1 white PNG data URL
    const origDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const maskBlob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

    // Should resolve with a valid string data URL or fallback
    const resultDataUrl = await EdgeRefinementEngine.refineMask(origDataUrl, maskBlob, {
      contrastSensitivity: 1.2,
      spillSuppression: 90,
      featherRadius: 1,
    });

    expect(typeof resultDataUrl).toBe('string');
    expect(resultDataUrl.startsWith('data:image/png')).toBe(true);
  });
});
