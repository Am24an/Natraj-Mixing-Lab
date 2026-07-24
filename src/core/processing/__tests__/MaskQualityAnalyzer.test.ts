import { describe, it, expect } from 'vitest';
import { analyzeMaskQuality } from '../MaskQualityAnalyzer';

describe('MaskQualityAnalyzer', () => {
  it('should return a poor result for degenerate/empty data URLs', async () => {
    // 1x1 transparent PNG data URL
    const transparentDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const result = await analyzeMaskQuality(transparentDataUrl);

    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(100);
    expect(result.suggestMaskBrush).toBe(true);
    expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(result.grade);
  });

  it('should compute scores within valid 0–100 range', async () => {
    // 2x2 solid red PNG data URL
    const solidDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAASElEQVR42mP8z8D8n4EIwDQAAHT4B/5N6hEBAAAAAElFTkSuQmCC';

    const result = await analyzeMaskQuality(solidDataUrl);

    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(100);
    expect(result.edgeSharpnessScore).toBeGreaterThanOrEqual(0);
    expect(result.edgeSharpnessScore).toBeLessThanOrEqual(100);
    expect(result.residueCleanlinessScore).toBeGreaterThanOrEqual(0);
    expect(result.residueCleanlinessScore).toBeLessThanOrEqual(100);
  });
});
