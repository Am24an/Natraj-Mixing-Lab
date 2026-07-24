/**
 * analyzeMaskQuality — Analyzes a BG-removed PNG mask to score output quality.
 *
 * Algorithm:
 *  1. Decode the PNG into an OffscreenCanvas (gets full RGBA pixel access)
 *  2. Compute transparency coverage — what % was removed
 *  3. Compute edge sharpness — sample alpha along the subject boundary.
 *     A sharp, clean edge transitions quickly (0→255 in 1-2 px) = high score.
 *     A blurry or feathered edge spreads over many pixels = lower score.
 *  4. Detect residue — semi-transparent pixels (alpha 10–200) far from the
 *     detected edge indicate background bleed = penalty.
 *  5. Combine into a 0–100 quality score.
 *
 * Runs entirely off the main thread when called from a Worker, or on the
 * main thread for quick analysis (the pixel math is fast — O(n) single pass).
 */

export interface MaskQualityResult {
  /** Overall quality 0–100. 80+ = clean, 50–79 = acceptable, <50 = noisy */
  qualityScore: number;
  /** 0–1: fraction of pixels made transparent */
  transparencyPct: number;
  /** 0–100: how sharp the subject boundary is */
  edgeSharpnessScore: number;
  /** 0–100: 100 = no residue detected; lower = more background bleed */
  residueCleanlinessScore: number;
  /** Human-readable grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' */
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  /** Whether the user should be nudged toward the Mask Brush */
  suggestMaskBrush: boolean;
}

/**
 * Analyzes a PNG data URL (the bg-removed mask) and returns quality metrics.
 * Uses createImageBitmap + OffscreenCanvas for fully off-thread-safe pixel access.
 */
export async function analyzeMaskQuality(
  maskDataUrl: string
): Promise<MaskQualityResult> {
  if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return defaultPoorResult();
  }

  const blob = dataUrlToBlob(maskDataUrl);
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  if (width === 0 || height === 0) {
    bitmap.close();
    return defaultPoorResult();
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    return defaultPoorResult();
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, width, height);
  const total = width * height;

  // ── 2. Transparency coverage ─────────────────────────────────────────────
  let transparentPixels = 0;   // alpha < 10  (background = removed)
  let semiPixels = 0;          // alpha 10–245 (edge or residue)

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 10) transparentPixels++;
    else if (a <= 245) semiPixels++;
  }

  const transparencyPct = transparentPixels / total;

  // Safety: if nothing was removed or everything was removed = degenerate
  if (transparencyPct < 0.01 || transparencyPct > 0.99) {
    return { ...defaultPoorResult(), transparencyPct };
  }

  // ── 3. Edge sharpness score ──────────────────────────────────────────────
  // Sample horizontal and vertical scan lines to measure transition width.
  // A perfectly sharp edge transitions in 1px (score 100).
  // A 10px feathered transition scores ~40.
  const SAMPLE_LINES = 64;
  let totalTransitionWidth = 0;
  let transitionCount = 0;

  // Horizontal scans
  const yStep = Math.max(1, Math.floor(height / SAMPLE_LINES));
  for (let y = 0; y < height; y += yStep) {
    let inEdge = false;
    let edgeStart = -1;
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      const isEdge = a > 5 && a < 250;
      if (isEdge && !inEdge) {
        inEdge = true;
        edgeStart = x;
      } else if (!isEdge && inEdge) {
        inEdge = false;
        totalTransitionWidth += x - edgeStart;
        transitionCount++;
      }
    }
  }

  // Vertical scans
  const xStep = Math.max(1, Math.floor(width / SAMPLE_LINES));
  for (let x = 0; x < width; x += xStep) {
    let inEdge = false;
    let edgeStart = -1;
    for (let y = 0; y < height; y++) {
      const a = data[(y * width + x) * 4 + 3];
      const isEdge = a > 5 && a < 250;
      if (isEdge && !inEdge) {
        inEdge = true;
        edgeStart = y;
      } else if (!isEdge && inEdge) {
        inEdge = false;
        totalTransitionWidth += y - edgeStart;
        transitionCount++;
      }
    }
  }

  const avgTransitionWidth = transitionCount > 0
    ? totalTransitionWidth / transitionCount
    : 10;

  // Clamp: 1px = 100 score, 20px = 0 score
  const edgeSharpnessScore = Math.max(0, Math.min(100, 100 - (avgTransitionWidth - 1) * 5));

  // ── 4. Residue / cleanliness score ──────────────────────────────────────
  // Count semi-transparent pixels that are NOT at the edge of the subject
  // boundary. True edge pixels are OK. Semi-transparent pixels isolated in
  // the background area = residue.
  //
  // Heuristic: if semiPixels is more than 5% of transparent pixels → residue.
  const semiRatio = semiPixels / Math.max(1, transparentPixels + semiPixels);
  const residueCleanlinessScore = Math.max(0, Math.min(100, 100 - semiRatio * 200));

  // ── 5. Overall quality score ─────────────────────────────────────────────
  // Weighted combination: edge sharpness matters most for album photos
  const qualityScore = Math.round(
    edgeSharpnessScore * 0.55 +
    residueCleanlinessScore * 0.45
  );

  const grade =
    qualityScore >= 80 ? 'Excellent' :
    qualityScore >= 60 ? 'Good' :
    qualityScore >= 40 ? 'Fair' : 'Poor';

  const suggestMaskBrush = qualityScore < 65;

  return {
    qualityScore,
    transparencyPct,
    edgeSharpnessScore: Math.round(edgeSharpnessScore),
    residueCleanlinessScore: Math.round(residueCleanlinessScore),
    grade,
    suggestMaskBrush,
  };
}

function defaultPoorResult(): MaskQualityResult {
  return {
    qualityScore: 0,
    transparencyPct: 0,
    edgeSharpnessScore: 0,
    residueCleanlinessScore: 0,
    grade: 'Poor',
    suggestMaskBrush: true,
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}
