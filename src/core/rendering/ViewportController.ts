// Viewport Controller — Zoom & Pan
// Viewport Controller

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ViewportConstraints {
  minZoom: number;
  maxZoom: number;
}

const DEFAULT_CONSTRAINTS: ViewportConstraints = {
  minZoom: 0.1,
  maxZoom: 5.0, // 500% zoom for pixel-level eraser editing
};

// ViewportController

class ViewportController {
  private state: ViewportState = { zoom: 1, panX: 0, panY: 0 };
  private constraints: ViewportConstraints;
  private listeners: Array<(state: ViewportState) => void> = [];

  constructor(constraints: Partial<ViewportConstraints> = {}) {
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  }


  get zoom(): number {
    return this.state.zoom;
  }

  get panX(): number {
    return this.state.panX;
  }

  get panY(): number {
    return this.state.panY;
  }

  getState(): ViewportState {
    return { ...this.state };
  }


  /**
   * Zoom toward/away from a focal point (e.g., mouse cursor position).
   * @param delta Positive = zoom in, negative = zoom out
   * @param focalX X coordinate in canvas CSS pixels (optional, defaults to center)
   * @param focalY Y coordinate in canvas CSS pixels (optional, defaults to center)
   */
  zoom_by(delta: number, focalX?: number, focalY?: number): void {
    const prevZoom = this.state.zoom;
    const nextZoom = this.clampZoom(prevZoom + delta * prevZoom);
    const ratio = nextZoom / prevZoom;

    const fx = focalX ?? 0;
    const fy = focalY ?? 0;

    this.state = {
      zoom: nextZoom,
      panX: fx * (1 - ratio) + this.state.panX * ratio,
      panY: fy * (1 - ratio) + this.state.panY * ratio,
    };
    this.notify();
  }

  setZoom(zoom: number, focalX = 0, focalY = 0): void {
    const prevZoom = this.state.zoom;
    const nextZoom = this.clampZoom(zoom);
    const ratio = nextZoom / prevZoom;

    this.state = {
      zoom: nextZoom,
      panX: focalX - ratio * (focalX - this.state.panX),
      panY: focalY - ratio * (focalY - this.state.panY),
    };
    this.notify();
  }


  pan(dx: number, dy: number): void {
    this.state = {
      ...this.state,
      panX: this.state.panX + dx,
      panY: this.state.panY + dy,
    };
    this.notify();
  }


  /** Reset to 1:1 zoom, centered */
  resetToFit(): void {
    this.state = { zoom: 1, panX: 0, panY: 0 };
    this.notify();
  }

  /** Set zoom to 100% (actual pixels) */
  setActualSize(): void {
    this.state = { ...this.state, zoom: 1 };
    this.notify();
  }

  /** Fit image to canvas (handled at render time, this just resets pan) */
  fitToView(): void {
    this.state = { zoom: 1, panX: 0, panY: 0 };
    this.notify();
  }


  private clampZoom(zoom: number): number {
    return Math.max(this.constraints.minZoom, Math.min(this.constraints.maxZoom, zoom));
  }


  subscribe(listener: (state: ViewportState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.getState()));
  }
}

// Singleton used by the editor
export const viewportController = new ViewportController();
