import { useEditorStore } from '@/stores/editorStore';
import type { ActiveTool } from '@/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import {
  Eraser,
  Palette,
  Crop,
  Sliders,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ToolItem {
  id: ActiveTool;
  label: string;
  icon: React.ReactNode;
  requiresProject: boolean;
}

const TOOLS: ToolItem[] = [
  { id: 'crop', label: 'Crop', icon: <Crop size={20} strokeWidth={1.75} />, requiresProject: true },
  { id: 'background-removal', label: 'Remove BG', icon: <Eraser size={20} strokeWidth={1.75} />, requiresProject: true },
  { id: 'background-color', label: 'BG Color', icon: <Palette size={20} strokeWidth={1.75} />, requiresProject: true },
  { id: 'enhancement', label: 'Enhance', icon: <Sliders size={20} strokeWidth={1.75} />, requiresProject: true },
  { id: 'upscale', label: 'Upscale', icon: <Sparkles size={20} strokeWidth={1.75} />, requiresProject: true },
];

interface LeftToolbarProps {
  hasProject: boolean;
}

export function LeftToolbar({ hasProject }: LeftToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const resetBackground = useEditorStore((s) => s.resetBackground);
  const resetCrop = useEditorStore((s) => s.resetCrop);
  const resetEnhancement = useEditorStore((s) => s.resetEnhancement);

  const handleReset = () => {
    if (!hasProject) return;
    resetBackground();
    resetCrop();
    resetEnhancement();
  };

  return (
    <aside
      aria-label="Editing tools"
      className="mobile-toolbar-inner flex flex-col md:w-[var(--sidebar-width)] h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] items-center py-2 gap-1 overflow-y-auto overflow-x-hidden"
    >
      {TOOLS.map((tool) => {
        const isDisabled = tool.requiresProject && !hasProject;
        const isActive = activeTool === tool.id;

        return (
          <ToolButton
            key={tool.id}
            tool={tool}
            isActive={isActive}
            isDisabled={isDisabled}
            onClick={() => setActiveTool(isActive ? null : tool.id)}
          />
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Reset Button */}
      <div className="w-full px-1 border-t border-[var(--color-border)] pt-2 md:mt-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={!hasProject}
          title="Reset all edits"
          aria-label="Reset all edits"
          className={cn('w-full flex-col gap-1 h-[56px] rounded-sm')}
        >
          <RotateCcw size={18} strokeWidth={1.75} />
          <span style={{ fontSize: '10px' }}>Reset</span>
        </Button>
      </div>
    </aside>
  );
}

// --------------------------------------------------------------------------
// Tool Button
// --------------------------------------------------------------------------

interface ToolButtonProps {
  tool: ToolItem;
  isActive: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function ToolButton({ tool, isActive, isDisabled, onClick }: ToolButtonProps) {
  return (
    <div
      style={{
        width: '100%',
        padding: '0 var(--space-xs)',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        aria-pressed={isActive}
        aria-label={tool.label}
        title={tool.label}
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          background: isActive ? 'var(--color-primary-light)' : 'transparent',
          color: isActive
            ? 'var(--color-primary)'
            : isDisabled
              ? 'var(--color-text-disabled)'
              : 'var(--color-text-muted)',
          opacity: isDisabled ? 0.4 : 1,
          transition: `background var(--duration-hover) var(--easing-out), color var(--duration-hover) var(--easing-out)`,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled && !isActive) {
            (e.currentTarget).style.background =
              'var(--color-surface-secondary)';
            (e.currentTarget).style.color = 'var(--color-text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget).style.background = 'transparent';
            (e.currentTarget).style.color = isDisabled
              ? 'var(--color-text-disabled)'
              : 'var(--color-text-muted)';
          }
        }}
      >
        {tool.icon}
        <span style={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>{tool.label}</span>
      </button>
    </div>
  );
}
