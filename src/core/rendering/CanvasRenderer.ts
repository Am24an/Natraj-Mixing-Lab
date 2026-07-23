// Canvas Renderer — Core Rendering Engine
// Core Editor Engine

import type { EditingState } from '@/types';
import { ImageProcessor } from '../processing/ImageProcessor';
import { getCanvasContext } from '@/utils/image';

// Renderer Config

export interface RendererConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface RenderOptions {
  showCheckerboard?: boolean;
  backgroundColor?: string | null;
  maskDataUrl?: string | null;
  zoom?: number;
  panX?: number;
  panY?: number;
}

// Canvas Renderer Class

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private sourceImage: HTMLImageElement | null = null;
  private maskImage: OffscreenCanvas | HTMLImageElement | null = null;
  
  // re-importing the mask when the change came from the eraser itself.
  private maskVersion = 0;
  private lastImportedMaskUrl: string | null = null;

  // Cache for pixel-processed image (sharpness, highlights, shadows)
  private processedCache: OffscreenCanvas | null = null;
  private lastEnhancementKey = '';

  private lastEditingState: EditingState | null = null;
  private lastOptions: RenderOptions | null = null;

  constructor(config: RendererConfig) {
    this.canvas = config.canvas;
    this.ctx = getCanvasContext(config.canvas);
    this.dpr = config.devicePixelRatio ?? window.devicePixelRatio ?? 1;
    this.resize(config.width, config.height);
  }

  // Setup

  resize(width: number, height: number): void {
    const dpr = this.dpr;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.markDirty();
  }

  setSourceImage(image: HTMLImageElement): void {
    this.sourceImage = image;
    this.processedCache = null;
    this.lastEnhancementKey = '';
    this.maskImage = null;
    this.markDirty();
    if (this.lastEditingState && this.lastOptions) {
      this.render(this.lastEditingState, this.lastOptions);
    }
  }

  /**
   * Import a mask from a data URL. Skips re-import if the URL matches
   * the last one we exported (eraser brush stroke cycle).
   */
  setMaskImage(maskDataUrl: string): Promise<void> {
    // Skip re-import if this URL was just exported by the eraser
    if (maskDataUrl === this.lastImportedMaskUrl && this.maskImage instanceof OffscreenCanvas) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch {
          // ignore decode errors and fallback to immediate render
        }
        
        // Convert to OffscreenCanvas to allow manual brush edits
        const canvas = new OffscreenCanvas(img.naturalWidth, img.naturalHeight);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          this.maskImage = canvas;
        } else {
          this.maskImage = img; // Fallback
        }

        this.lastImportedMaskUrl = maskDataUrl;
        this.maskVersion = 0; // Reset version for fresh external mask
        
        this.markDirty();
        if (this.lastEditingState && this.lastOptions) {
          this.render(this.lastEditingState, this.lastOptions);
        }
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load mask image'));
      img.src = maskDataUrl;
    });
  }

  clearMask(): void {
    this.maskImage = null;
    this.markDirty();
  }

  
  applyBrushStroke(imgX: number, imgY: number, radius: number, mode: 'erase' | 'restore' | 'pan'): void {
    if (mode === 'pan' || !this.maskImage || !this.sourceImage) return;
    
    // Only works if maskImage is an OffscreenCanvas
    if (!(this.maskImage instanceof OffscreenCanvas)) return;
    
    const ctx = this.maskImage.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(imgX, imgY, radius, 0, Math.PI * 2);
    
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
    } else if (mode === 'restore') {
      ctx.clip();
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.sourceImage, 0, 0);
    }
    
    ctx.restore();
    
    // Invalidate enhancement cache since mask changed
    this.processedCache = null;
    this.lastEnhancementKey = '';
    this.maskVersion++;
    
    this.markDirty();
    if (this.lastEditingState && this.lastOptions) {
      this.render(this.lastEditingState, this.lastOptions);
    }
  }

  /**
   * Export the current mask OffscreenCanvas as a data URL.
   * Records the exported URL so setMaskImage() can skip re-importing it.
   */
  async getMaskDataUrl(): Promise<string> {
    if (!this.maskImage || !(this.maskImage instanceof OffscreenCanvas)) return '';
    const blob = await this.maskImage.convertToBlob({ type: 'image/png' });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to encode mask'));
      reader.readAsDataURL(blob);
    });
    // Record this URL so setMaskImage won't re-import our own output
    this.lastImportedMaskUrl = dataUrl;
    return dataUrl;
  }

  // Rendering

  markDirty(): void {
    // Reserved for future RAF-based dirty tracking
  }

  /**
   * Render one frame. Called on RAF loop or on-demand.
   */
  render(editingState: EditingState, options: RenderOptions = {}): void {
    this.lastEditingState = editingState;
    this.lastOptions = options;

    const {
      showCheckerboard = true,
      zoom = 1,
      panX = 0,
      panY = 0,
    } = options;

    const { background, enhancement, previewMode } = editingState;
    // Clear the full physical canvas (canvas.width/height are in physical pixels)
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    const isComparison = previewMode === 'comparison';
    const cssWidth = this.canvas.width / this.dpr;
    const cssHeight = this.canvas.height / this.dpr;

    if (!this.sourceImage) return;

    const imgW = this.sourceImage.naturalWidth;
    const imgH = this.sourceImage.naturalHeight;

    // --- Calculate source coordinates based on crop state ---
    const { crop } = editingState;
    let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
    
    // Only apply visual crop if not actively using the crop tool, and it actually has bounds
    if (!crop.isActive && crop.width > 0 && crop.height > 0 && (crop.width < 100 || crop.height < 100)) {
      srcX = imgW * (crop.x / 100);
      srcY = imgH * (crop.y / 100);
      srcW = imgW * (crop.width / 100);
      srcH = imgH * (crop.height / 100);
    }

    // --- Compute fit-to-canvas dimensions using cropped source size ---
    const scaleW = cssWidth / srcW;
    const scaleH = cssHeight / srcH;
    const fitScale = Math.min(scaleW, scaleH) * zoom;

    const drawW = srcW * fitScale;
    const drawH = srcH * fitScale;
    const drawX = (cssWidth - drawW) / 2 + panX;
    const drawY = (cssHeight - drawH) / 2 + panY;

    // --- Background layer ---
    if (!isComparison && background.isRemoved) {
      if (background.replacementColor) {
        this.ctx.fillStyle = background.replacementColor;
        this.ctx.fillRect(drawX, drawY, drawW, drawH);
      } else if (showCheckerboard) {
        this.drawCheckerboard(drawX, drawY, drawW, drawH);
      }
    }

    // --- Subject layer ---
    const { sharpness, highlights, shadows } = enhancement;
    const isPixelProcessingNeeded = sharpness !== 0 || highlights !== 0 || shadows !== 0;
    let imageToDraw: CanvasImageSource = this.sourceImage;
    const useMask = !isComparison && background.isRemoved && this.maskImage;
    if (useMask) {
      imageToDraw = this.maskImage!;
    }

    const layerKey = useMask ? 'mask' : 'original';
    const enhancementKey = isPixelProcessingNeeded ? `${sharpness}_${highlights}_${shadows}_${layerKey}` : 'none';

    // 2. Process pixels if needed (sharpness, highlights, shadows)
    if (enhancementKey !== 'none') {
      if (this.lastEnhancementKey !== enhancementKey || !this.processedCache) {
        const w = (imageToDraw as HTMLImageElement).naturalWidth || (imageToDraw as OffscreenCanvas).width || this.sourceImage.naturalWidth;
        const h = (imageToDraw as HTMLImageElement).naturalHeight || (imageToDraw as OffscreenCanvas).height || this.sourceImage.naturalHeight;
        this.processedCache = new OffscreenCanvas(w, h);
        const pCtx = this.processedCache.getContext('2d', { willReadFrequently: true })!;
        pCtx.drawImage(imageToDraw, 0, 0);
        
        const imageData = pCtx.getImageData(0, 0, w, h);
        ImageProcessor.applyEnhancements(imageData, enhancement);
        pCtx.putImageData(imageData, 0, 0);
        
        this.lastEnhancementKey = enhancementKey;
      }
      imageToDraw = this.processedCache;
    } else {
      this.processedCache = null;
      this.lastEnhancementKey = '';
    }

    // 3. Apply CSS filters (brightness, contrast, saturation)
    if (!isComparison) {
      this.ctx.filter = buildCSSFilter(enhancement);
    }

    // 4. Draw final image
    this.ctx.save();
    this.ctx.translate(drawX + drawW / 2, drawY + drawH / 2);

    if (crop.rotation !== 0) {
      this.ctx.rotate((crop.rotation * Math.PI) / 180);
    }
    if (crop.flipHorizontal || crop.flipVertical) {
      this.ctx.scale(crop.flipHorizontal ? -1 : 1, crop.flipVertical ? -1 : 1);
    }

    const actualImgW = (imageToDraw as HTMLImageElement).naturalWidth || (imageToDraw as OffscreenCanvas).width || imgW;
    const actualImgH = (imageToDraw as HTMLImageElement).naturalHeight || (imageToDraw as OffscreenCanvas).height || imgH;
    
    const scaleX = actualImgW / imgW;
    const scaleY = actualImgH / imgH;

    this.ctx.drawImage(
      imageToDraw, 
      srcX * scaleX, 
      srcY * scaleY, 
      srcW * scaleX, 
      srcH * scaleY, 
      -drawW / 2, 
      -drawH / 2, 
      drawW, 
      drawH
    );
    
    this.ctx.restore();
    this.ctx.filter = 'none';
  }


  // Checkerboard pattern for transparent backgrounds

  private drawCheckerboard(x: number, y: number, w: number, h: number): void {
    const size = 12;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();

    for (let row = 0; row * size < h; row++) {
      for (let col = 0; col * size < w; col++) {
        const isLight = (row + col) % 2 === 0;
        this.ctx.fillStyle = isLight ? '#ffffff' : '#e5e7eb';
        this.ctx.fillRect(x + col * size, y + row * size, size, size);
      }
    }

    this.ctx.restore();
  }


  // Export

  exportToBlob(format: 'jpeg' | 'png' | 'webp', quality = 0.95): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`;
      this.canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Export failed: canvas.toBlob returned null'));
        },
        mimeType,
        quality
      );
    });
  }

  exportToDataUrl(format: 'jpeg' | 'png' | 'webp', quality = 0.95): string {
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  // Coordinate Mapping
  
  screenToImageCoords(mouseX: number, mouseY: number, editingState: EditingState, options: RenderOptions = {}): { x: number, y: number } | null {
    if (!this.sourceImage) return null;

    const { zoom = 1, panX = 0, panY = 0 } = options;
    const cssWidth = this.canvas.width / this.dpr;
    const cssHeight = this.canvas.height / this.dpr;
    const imgW = this.sourceImage.naturalWidth;
    const imgH = this.sourceImage.naturalHeight;

    const { crop } = editingState;
    let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
    
    if (!crop.isActive && crop.width > 0 && crop.height > 0 && (crop.width < 100 || crop.height < 100)) {
      srcX = imgW * (crop.x / 100);
      srcY = imgH * (crop.y / 100);
      srcW = imgW * (crop.width / 100);
      srcH = imgH * (crop.height / 100);
    }

    const scaleW = cssWidth / srcW;
    const scaleH = cssHeight / srcH;
    const fitScale = Math.min(scaleW, scaleH) * zoom;

    const drawW = srcW * fitScale;
    const drawH = srcH * fitScale;
    const drawX = (cssWidth - drawW) / 2 + panX;
    const drawY = (cssHeight - drawH) / 2 + panY;

    if (mouseX < drawX || mouseX > drawX + drawW || mouseY < drawY || mouseY > drawY + drawH) {
      return null;
    }

    const croppedX = (mouseX - drawX) / fitScale;
    const croppedY = (mouseY - drawY) / fitScale;

    return {
      x: croppedX + srcX,
      y: croppedY + srcY
    };
  }

  // Cleanup

  destroy(): void {
    this.sourceImage = null;
    this.maskImage = null;
    this.processedCache = null;
  }
}

// Helper — Build CSS filter string from EnhancementState

function buildCSSFilter(enhancement: EditingState['enhancement']): string {
  const filters: string[] = [];

  if (enhancement.brightness !== 0) {
    // Map [-100, 100] → CSS brightness [0, 2] where 1.0 = no change
    filters.push(`brightness(${(1 + enhancement.brightness / 100).toFixed(3)})`);
  }
  if (enhancement.contrast !== 0) {
    // Map [-100, 100] → CSS contrast [0, 2]
    filters.push(`contrast(${(1 + enhancement.contrast / 100).toFixed(3)})`);
  }
  if (enhancement.saturation !== 0) {
    // Map [-100, 100] → CSS saturate [0, 2]
    filters.push(`saturate(${(1 + enhancement.saturation / 100).toFixed(3)})`);
  }

  // NOTE: sharpness, highlights, shadows require pixel-level Canvas API processing.
  // These are implemented via OffscreenCanvas + convolution.
  // CSS filters cannot express sharpness (unsharp mask) or selective highlight/shadow control.

  return filters.length > 0 ? filters.join(' ') : 'none';
}
