/**
 * EdgeRefinementEngine — Post-processing Alpha Matting & Spill Suppression
 *
 * Provides commercial-grade subject cutout quality (hair, ears, nose, ornaments)
 * by refining raw AI background removal masks:
 *
 * 1. Local Window Color Matting: Evaluates semi-transparent edge pixels against
 *    LOCAL foreground samples (within r=16px) and LOCAL background samples.
 *    Eliminates global color averaging flaws so gold/silver jewelry, skin contours
 *    of ears/nose, and multi-colored hair are accurately preserved.
 * 2. Ornament & Specular Protection: Preserves high-saturation or metallic/gem
 *    specular highlights (earrings, nose studs, necklaces).
 * 3. Directional Hair Strand Preservation: Detects elongated hair flyaways and
 *    preserves them based on local hair color continuity.
 * 4. Color Spill / Fringe Suppression: Neutralizes background color glare along edges.
 * 5. Gaussian Feathering: Applies smooth multi-pass anti-aliasing.
 */

export interface EdgeRefinementOptions {
  /** Edge contrast sensitivity (0.5–2.0, default 1.0) */
  contrastSensitivity?: number;
  /** Spill suppression strength (0–100, default 80) */
  spillSuppression?: number;
  /** Mask feathering radius in px (0–5, default 1) */
  featherRadius?: number;
}

export class EdgeRefinementEngine {
  /**
   * Refines a raw AI background cutout mask against the original image.
   * Can run in Web Worker or main thread using OffscreenCanvas / createImageBitmap.
   */
  static async refineMask(
    originalInput: string | Blob,
    rawMaskInput: string | Blob,
    options: EdgeRefinementOptions = {}
  ): Promise<string> {
    const {
      contrastSensitivity = 1.0,
      spillSuppression = 80,
      featherRadius = 1,
    } = options;

    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      return typeof rawMaskInput === 'string' ? rawMaskInput : blobToDataUrl(rawMaskInput);
    }

    const origBlob = typeof originalInput === 'string' ? await dataUrlToBlob(originalInput) : originalInput;
    const maskBlob = typeof rawMaskInput === 'string' ? await dataUrlToBlob(rawMaskInput) : rawMaskInput;

    let origBitmap: ImageBitmap | null = null;
    let maskBitmap: ImageBitmap | null = null;

    try {
      [origBitmap, maskBitmap] = await Promise.all([
        createImageBitmap(origBlob),
        createImageBitmap(maskBlob),
      ]);

      const w = origBitmap.width;
      const h = origBitmap.height;

      if (w === 0 || h === 0) {
        return typeof rawMaskInput === 'string' ? rawMaskInput : blobToDataUrl(rawMaskInput);
      }

      const origCanvas = new OffscreenCanvas(w, h);
      const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });

      const maskCanvas = new OffscreenCanvas(w, h);
      const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });

      if (!origCtx || !maskCtx) {
        return typeof rawMaskInput === 'string' ? rawMaskInput : blobToDataUrl(rawMaskInput);
      }

      origCtx.drawImage(origBitmap, 0, 0);
      maskCtx.drawImage(maskBitmap, 0, 0, w, h);

      const origImgData = origCtx.getImageData(0, 0, w, h);
      const maskImgData = maskCtx.getImageData(0, 0, w, h);

      const orig = origImgData.data;
      const mask = maskImgData.data;

      // ── Step 1: Local Window Color Matting ────────────────────────────────
      refineLocalWindowMatting(orig, mask, w, h, contrastSensitivity, spillSuppression);

      // ── Step 2: Directional Hair Strand Preservation ─────────────────────
      preserveDirectionalHairStrands(orig, mask, w, h);

      // ── Step 3: Morphological Gap Closing for Ornaments ──────────────────
      morphologicalClose(mask, w, h, 2);

      // ── Step 4: Gaussian Feathering ──────────────────────────────────────
      if (featherRadius > 0) {
        applyGaussianFeather(mask, w, h, featherRadius);
      }

      // ── Step 5: Threshold Polish ─────────────────────────────────────────
      for (let i = 0; i < mask.length; i += 4) {
        const a = mask[i + 3];
        if (a > 235) mask[i + 3] = 255;
        else if (a < 12) mask[i + 3] = 0;
      }

      maskCtx.putImageData(maskImgData, 0, 0);

      const resultBlob = await maskCanvas.convertToBlob({ type: 'image/png' });
      return blobToDataUrl(resultBlob);

    } catch (err) {
      console.warn('[EdgeRefinementEngine] Refinement failed, using fallback:', err);
      return typeof rawMaskInput === 'string' ? rawMaskInput : blobToDataUrl(rawMaskInput);
    } finally {
      if (origBitmap) origBitmap.close();
      if (maskBitmap) maskBitmap.close();
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Local Window Color Matting Algorithm
// ────────────────────────────────────────────────────────────────────────────

function refineLocalWindowMatting(
  orig: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  w: number,
  h: number,
  contrastSensitivity: number,
  spillSuppression: number
): void {
  const suppressRatio = spillSuppression / 100;
  const LOCAL_RADIUS = 16; // 33x33 window for local context
  const SAMPLE_STEP = 3;   // sample every 3rd neighbor for speed

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const alpha = mask[i + 3];

      // Process semi-transparent edge pixels
      if (alpha > 5 && alpha < 250) {
        const pr = orig[i];
        const pg = orig[i + 1];
        const pb = orig[i + 2];

        // Collect local FG and BG color samples
        let minDistFg = Infinity;
        let minDistBg = Infinity;
        let solidFgR = pr, solidFgG = pg, solidFgB = pb;
        let foundFg = false;
        let fgCount = 0;
        let bgCount = 0;

        const yMin = Math.max(0, y - LOCAL_RADIUS);
        const yMax = Math.min(h - 1, y + LOCAL_RADIUS);
        const xMin = Math.max(0, x - LOCAL_RADIUS);
        const xMax = Math.min(w - 1, x + LOCAL_RADIUS);

        for (let ny = yMin; ny <= yMax; ny += SAMPLE_STEP) {
          for (let nx = xMin; nx <= xMax; nx += SAMPLE_STEP) {
            const nIdx = (ny * w + nx) * 4;
            const nAlpha = mask[nIdx + 3];
            const nR = orig[nIdx];
            const nG = orig[nIdx + 1];
            const nB = orig[nIdx + 2];

            const dist = colorDist(pr, pg, pb, nR, nG, nB);

            if (nAlpha > 220) {
              fgCount++;
              if (dist < minDistFg) {
                minDistFg = dist;
                solidFgR = nR;
                solidFgG = nG;
                solidFgB = nB;
                foundFg = true;
              }
            } else if (nAlpha < 20) {
              bgCount++;
              if (dist < minDistBg) {
                minDistBg = dist;
              }
            }
          }
        }

        // Ornament / Specular Highlights Check (Earrings, nose ring, metallic/gem accessories)
        const maxC = Math.max(pr, pg, pb);
        const minC = Math.min(pr, pg, pb);
        const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;
        const isSpecular = maxC > 230 && minC > 180; // metallic / gem highlight
        const isLikelyOrnament = (saturation > 0.30 || isSpecular) && (fgCount >= bgCount / 2);

        if (foundFg && (minDistFg < Infinity || minDistBg < Infinity)) {
          const dFg = minDistFg === Infinity ? 255 : minDistFg;
          const dBg = minDistBg === Infinity ? 255 : minDistBg;
          const totalD = dFg + dBg;

          if (totalD > 0) {
            // Local probability of being foreground
            let localFgProb = dBg / totalD;

            // Saturation & ornament bias
            if (isLikelyOrnament) {
              localFgProb = Math.min(1, localFgProb + 0.30);
            }

            // Blend raw AI alpha with local matting result
            const mattedAlpha = Math.round(localFgProb * 255);
            // Weight: 65% local color matting, 35% raw AI structural prior
            let refinedAlpha = Math.round(mattedAlpha * 0.65 + alpha * 0.35);

            // Contrast enhancement
            if (Math.abs(dFg - dBg) > 25 * contrastSensitivity) {
              if (refinedAlpha > 120) refinedAlpha = Math.min(255, refinedAlpha + 35);
              else refinedAlpha = Math.max(0, refinedAlpha - 35);
            }

            mask[i + 3] = Math.max(0, Math.min(255, refinedAlpha));
          }
        }

        // Color Spill Suppression along edge boundaries
        if (suppressRatio > 0 && foundFg && !isLikelyOrnament) {
          const distToFg = colorDist(pr, pg, pb, solidFgR, solidFgG, solidFgB);
          if (distToFg > 25) {
            mask[i] = Math.round(pr * (1 - suppressRatio) + solidFgR * suppressRatio);
            mask[i + 1] = Math.round(pg * (1 - suppressRatio) + solidFgG * suppressRatio);
            mask[i + 2] = Math.round(pb * (1 - suppressRatio) + solidFgB * suppressRatio);
          }
        }
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Directional Hair Strand Preservation
// ────────────────────────────────────────────────────────────────────────────

function preserveDirectionalHairStrands(
  orig: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  w: number,
  h: number
): void {
  const len = w * h;
  const alphaCopy = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    alphaCopy[i] = mask[i * 4 + 3];
  }

  const STRAND_MIN_LEN = 3;
  const ALPHA_LOW = 15;
  const ALPHA_HIGH = 210;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const a = alphaCopy[idx];

      if (a < ALPHA_LOW || a > ALPHA_HIGH) continue;

      // Horizontal run length
      let hRun = 1;
      for (let dx = 1; x + dx < w && dx < 8; dx++) {
        const nA = alphaCopy[idx + dx];
        if (nA >= ALPHA_LOW && nA <= ALPHA_HIGH && Math.abs(nA - a) < 55) hRun++;
        else break;
      }

      // Vertical run length
      let vRun = 1;
      for (let dy = 1; y + dy < h && dy < 8; dy++) {
        const nA = alphaCopy[(y + dy) * w + x];
        if (nA >= ALPHA_LOW && nA <= ALPHA_HIGH && Math.abs(nA - a) < 55) vRun++;
        else break;
      }

      if (hRun >= STRAND_MIN_LEN || vRun >= STRAND_MIN_LEN) {
        const pxIdx = idx * 4;
        const pr = orig[pxIdx], pg = orig[pxIdx + 1], pb = orig[pxIdx + 2];

        // Check if color matches nearby solid subject hair
        let matchesHair = false;
        const R = 4;
        for (let sy = Math.max(0, y - R); sy <= Math.min(h - 1, y + R) && !matchesHair; sy++) {
          for (let sx = Math.max(0, x - R); sx <= Math.min(w - 1, x + R) && !matchesHair; sx++) {
            const sIdx = sy * w + sx;
            if (alphaCopy[sIdx] > 220) {
              const fR = orig[sIdx * 4], fG = orig[sIdx * 4 + 1], fB = orig[sIdx * 4 + 2];
              if (colorDist(pr, pg, pb, fR, fG, fB) < 45) {
                matchesHair = true;
              }
            }
          }
        }

        if (matchesHair) {
          mask[pxIdx + 3] = Math.min(255, a + 50);
        }
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Morphological Closing & Gaussian Feathering
// ────────────────────────────────────────────────────────────────────────────

function morphologicalClose(
  mask: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number
): void {
  const len = w * h;
  const alphaCopy = new Uint8Array(len);
  for (let i = 0; i < len; i++) alphaCopy[i] = mask[i * 4 + 3];

  const dilated = new Uint8Array(len);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let maxA = alphaCopy[idx];
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(h - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(w - 1, x + radius);

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const nIdx = ny * w + nx;
          if (alphaCopy[nIdx] > maxA) maxA = alphaCopy[nIdx];
        }
      }
      dilated[idx] = maxA;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      let minA = dilated[idx];
      const yMin = Math.max(0, y - radius);
      const yMax = Math.min(h - 1, y + radius);
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(w - 1, x + radius);

      for (let ny = yMin; ny <= yMax; ny++) {
        for (let nx = xMin; nx <= xMax; nx++) {
          const nIdx = ny * w + nx;
          if (dilated[nIdx] < minA) minA = dilated[nIdx];
        }
      }

      const currAlpha = mask[idx * 4 + 3];
      if (minA > currAlpha) {
        mask[idx * 4 + 3] = minA;
      }
    }
  }
}

function applyGaussianFeather(
  maskData: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number
): void {
  const len = w * h;
  const alphaCopy = new Uint8Array(len);

  const passes = Math.min(radius, 3);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < len; i++) alphaCopy[i] = maskData[i * 4 + 3];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const centerAlpha = alphaCopy[idx];

        if (centerAlpha > 0 && centerAlpha < 255) {
          const sum =
            alphaCopy[(y - 1) * w + (x - 1)] * 1 +
            alphaCopy[(y - 1) * w + x] * 2 +
            alphaCopy[(y - 1) * w + (x + 1)] * 1 +
            alphaCopy[y * w + (x - 1)] * 2 +
            centerAlpha * 4 +
            alphaCopy[y * w + (x + 1)] * 2 +
            alphaCopy[(y + 1) * w + (x - 1)] * 1 +
            alphaCopy[(y + 1) * w + x] * 2 +
            alphaCopy[(y + 1) * w + (x + 1)] * 1;

          maskData[idx * 4 + 3] = Math.round(sum / 16);
        }
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────────

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = (r1 - r2) * 0.30;
  const dg = (g1 - g2) * 0.59;
  const db = (b1 - b2) * 0.11;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((r) => r.blob());
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${blob.type || 'image/png'};base64,${base64}`;
}
