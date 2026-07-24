import type { ActiveTool } from '@/types';
import { BackgroundRemovalPanel } from './panels/BackgroundRemovalPanel';
import { BackgroundColorPanel } from './panels/BackgroundColorPanel';
import { CropTransformPanel } from './panels/CropTransformPanel';
import { EnhancementPanel } from './panels/EnhancementPanel';
import { UpscalePanel } from './panels/UpscalePanel';
import { EraserPanel } from './panels/EraserPanel'; 

interface RightPanelProps {
  activeTool: ActiveTool;
  hasProject: boolean;
}

/**
 * RightPanel — renders contextual tool panels based on active tool.
 */
export function RightPanel({ activeTool, hasProject }: RightPanelProps) {
  const renderPanel = () => {
    if (!hasProject) return <EmptyPanelState />;
    if (!activeTool) return <NoToolSelectedState />;

    switch (activeTool) {
      case 'background-removal':
        return <BackgroundRemovalPanel />;
      case 'background-color':
        return <BackgroundColorPanel />;
      case 'crop':
        return <CropTransformPanel />;
      case 'enhancement':
        return <EnhancementPanel />;
      case 'upscale':
        return <UpscalePanel />;
      case 'eraser':
        return <EraserPanel />;
      default:
        return <NoToolSelectedState />;
    }
  };

  return (
    <aside
      aria-label="Tool options"
      className="mobile-panel-inner flex flex-col md:w-[var(--panel-width)] h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] overflow-hidden"
    >
      {/* Panel Header */}
      <div
        style={{
          padding: 'var(--space-md)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {getPanelTitle(activeTool)}
        </h2>
      </div>

      {/* Panel Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--space-md)',
        }}
      >
        {renderPanel()}
      </div>
    </aside>
  );
}

// Helpers

function getPanelTitle(tool: ActiveTool): string {
  const TOOL_TITLES: Record<Exclude<ActiveTool, null>, string> = {
    'background-removal': 'Remove Background',
    'background-color': 'Background Color',
    crop: 'Crop & Transform',
    enhancement: 'Enhancements',
    comparison: 'Compare',
    upscale: 'AI Upscaler',
    eraser: 'Magic Eraser',
  };
  return tool ? TOOL_TITLES[tool] : 'Options';
}

function EmptyPanelState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-sm)',
        textAlign: 'center',
        padding: 'var(--space-lg)',
      }}
    >
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
        Upload a photo to start editing
      </p>
    </div>
  );
}

function NoToolSelectedState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--space-sm)',
        textAlign: 'center',
        padding: 'var(--space-lg)',
      }}
    >
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
        Select a tool from the left toolbar to begin editing
      </p>
    </div>
  );
}

