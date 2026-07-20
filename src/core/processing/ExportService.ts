import type { Project } from '@/types';
import { ImageProcessor } from './ImageProcessor';

export type ExportFormat = 'jpeg' | 'png' | 'webp';

export class ExportService {
  /**
   * Generates a composited image from a project state and triggers a browser download.
   */
  static async exportProject(project: Project, format: ExportFormat, quality: number): Promise<void> {
    const { editingState } = project;
    const { crop, background, enhancement } = editingState;

    if (!project.originalImage) throw new Error('No original image found in project');

    // 1. Load Original Source
    const src = new Image();
    src.src = project.originalImage.dataUrl;
    if ('decode' in src) {
      await src.decode();
    } else {
      await new Promise<void>((res, rej) => {
        (src as HTMLImageElement).onload = () => res();
        (src as HTMLImageElement).onerror = () => rej(new Error('Failed to load source image'));
      });
    }

    const origW = src.naturalWidth;
    const origH = src.naturalHeight;

    // 2. Calculate crop bounds exactly
    const cx = crop.width === 0 ? 0 : (crop.x / 100) * origW;
    const cy = crop.height === 0 ? 0 : (crop.y / 100) * origH;
    const cw = crop.width === 0 ? origW : (crop.width / 100) * origW;
    const ch = crop.height === 0 ? origH : (crop.height / 100) * origH;

    // 3. Create canvas
    const canvas = document.createElement('canvas');
    const isRotated = crop.rotation % 180 !== 0;
    canvas.width = Math.round(isRotated ? ch : cw);
    canvas.height = Math.round(isRotated ? cw : ch);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Background color
    if (background.replacementColor) {
      ctx.fillStyle = background.replacementColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // CSS Filters
    const filters: string[] = [];
    if (enhancement.brightness !== 0) filters.push(`brightness(${1 + enhancement.brightness / 100})`);
    if (enhancement.contrast !== 0) filters.push(`contrast(${1 + enhancement.contrast / 100})`);
    if (enhancement.saturation !== 0) filters.push(`saturate(${1 + enhancement.saturation / 100})`);
    if (filters.length > 0) ctx.filter = filters.join(' ');

    // Transform and draw original image
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.scale(crop.flipHorizontal ? -1 : 1, crop.flipVertical ? -1 : 1);
    ctx.drawImage(src, cx, cy, cw, ch, -cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    ctx.filter = 'none';

    // 4. Handle removed background mask
    if (background.isRemoved && background.maskDataUrl) {
      // Clear and redraw using the result PNG
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (background.replacementColor) {
        ctx.fillStyle = background.replacementColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const resultImg = new Image();
      resultImg.src = background.maskDataUrl;
      if ('decode' in resultImg) {
        await resultImg.decode();
      } else {
        await new Promise<void>((res) => { (resultImg as HTMLImageElement).onload = () => res(); });
      }

      // Crop bounds specifically for the mask image
      const maskCx = (crop.width === 0 ? 0 : crop.x / 100) * resultImg.naturalWidth;
      const maskCy = (crop.height === 0 ? 0 : crop.y / 100) * resultImg.naturalHeight;
      const maskCw = (crop.width === 0 ? resultImg.naturalWidth : (crop.width / 100) * resultImg.naturalWidth);
      const maskCh = (crop.height === 0 ? resultImg.naturalHeight : (crop.height / 100) * resultImg.naturalHeight);

      if (filters.length > 0) ctx.filter = filters.join(' ');
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((crop.rotation * Math.PI) / 180);
      ctx.scale(crop.flipHorizontal ? -1 : 1, crop.flipVertical ? -1 : 1);
      ctx.drawImage(resultImg, maskCx, maskCy, maskCw, maskCh, -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
      ctx.filter = 'none';
    }

    // 5. Apply Pixel Enhancements
    if (enhancement.sharpness !== 0 || enhancement.highlights !== 0 || enhancement.shadows !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ImageProcessor.applyEnhancements(imageData, enhancement);
      ctx.putImageData(imageData, 0, 0);
    }

    // 6. Export Blob
    const mimeType = `image/${format}`;
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, mimeType, quality / 100)
    );

    if (!blob) throw new Error('Export failed — canvas returned empty blob');

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
