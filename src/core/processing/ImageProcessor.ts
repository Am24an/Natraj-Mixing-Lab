// =============================================================================
// ImageProcessor — Pixel-level processing for advanced enhancements
// Handles Sharpness (Convolution) and Highlights/Shadows (Tone Mapping)
// =============================================================================

export interface PixelEnhancements {
  sharpness: number; // 0 to 100
  highlights: number; // -100 to 100
  shadows: number;    // -100 to 100
}

export class ImageProcessor {
  /**
   * Applies pixel-level enhancements to ImageData.
   * Modifies the input ImageData in place to save memory allocations.
   */
  static applyEnhancements(imageData: ImageData, enhancements: PixelEnhancements): void {
    const { sharpness, highlights, shadows } = enhancements;
    
    // Fast path: if nothing to do, return early
    if (sharpness === 0 && highlights === 0 && shadows === 0) {
      return;
    }

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const len = data.length;

    // 1. Tone Mapping (Highlights & Shadows)
    if (highlights !== 0 || shadows !== 0) {
      // Normalize values to [-1, 1]
      const hAmount = highlights / 100;
      const sAmount = shadows / 100;

      for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Convert to perceived luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Luminance factor [0, 1]
        const lNorm = lum / 255;

        // Shadow adjustment (affects darker pixels more)
        // If sAmount > 0 (brighten shadows), we increase values where lNorm is low.
        const shadowFactor = sAmount * (1 - lNorm) * (1 - lNorm);
        
        // Highlight adjustment (affects brighter pixels more)
        // If hAmount < 0 (recover highlights), we decrease values where lNorm is high.
        const highlightFactor = hAmount * lNorm * lNorm;

        // Apply adjustments
        r = r + (r * shadowFactor) + (r * highlightFactor);
        g = g + (g * shadowFactor) + (g * highlightFactor);
        b = b + (b * shadowFactor) + (b * highlightFactor);

        // Clamp
        data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
    }

    // 2. Convolution (Sharpness via simple 3x3 Laplacian Unsharp Mask)
    if (sharpness > 0) {
      // Normalize sharpness to [0, 2] weight
      const amount = (sharpness / 100) * 1.5;
      
      // We need a copy of the original data to convolve safely
      const copy = new Uint8ClampedArray(data);
      
      // 3x3 kernel:
      //  0 -a  0
      // -a 1+4a -a
      //  0 -a  0
      
      const a = amount;
      const center = 1 + 4 * a;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          const up = ((y - 1) * width + x) * 4;
          const down = ((y + 1) * width + x) * 4;
          const left = (y * width + (x - 1)) * 4;
          const right = (y * width + (x + 1)) * 4;

          for (let c = 0; c < 3; c++) {
            const val = 
              copy[idx + c] * center -
              copy[up + c] * a -
              copy[down + c] * a -
              copy[left + c] * a -
              copy[right + c] * a;
            
            data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
          }
        }
      }
    }
  }
}
