import { describe, it, expect } from 'vitest';

/**
 * Calculates exact rotated bounding box dimensions.
 * Formula: exportW = |cw * cos(θ)| + |ch * sin(θ)|
 */
function calculateRotatedBoundingBox(cw: number, ch: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const exportW = Math.round(cw * cos + ch * sin);
  const exportH = Math.round(cw * sin + ch * cos);

  return { exportW, exportH };
}

describe('ExportService Rotation Bounding Box Math', () => {
  it('should maintain exact dimensions at 0 degrees', () => {
    const { exportW, exportH } = calculateRotatedBoundingBox(1000, 800, 0);
    expect(exportW).toBe(1000);
    expect(exportH).toBe(800);
  });

  it('should swap width and height at 90 degrees', () => {
    const { exportW, exportH } = calculateRotatedBoundingBox(1000, 800, 90);
    expect(exportW).toBe(800);
    expect(exportH).toBe(1000);
  });

  it('should expand bounding box to prevent corner clipping at 45 degrees', () => {
    const { exportW, exportH } = calculateRotatedBoundingBox(1000, 1000, 45);
    // For 1000x1000 square at 45 deg: 1000 * cos(45) + 1000 * sin(45) = 1414
    expect(exportW).toBe(1414);
    expect(exportH).toBe(1414);
  });

  it('should handle negative rotation angles correctly (-90 degrees)', () => {
    const { exportW, exportH } = calculateRotatedBoundingBox(1200, 600, -90);
    expect(exportW).toBe(600);
    expect(exportH).toBe(1200);
  });
});
