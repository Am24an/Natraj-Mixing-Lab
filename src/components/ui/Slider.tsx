import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

// Slider Component — wraps the native range input with design system styling

export interface SliderProps {
  id?: string;
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  showReset?: boolean;
  showValue?: boolean;
  unit?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      id,
      label,
      value,
      min = -100,
      max = 100,
      step = 1,
      defaultValue = 0,
      showReset = true,
      showValue = true,
      unit = '',
      disabled = false,
      className,
      onChange,
      onReset,
    },
    ref
  ) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isAtDefault = value === defaultValue;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {/* Label Row */}
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={id}
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {label}
              </label>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {showValue && (
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{
                    color: isAtDefault
                      ? 'var(--color-text-muted)'
                      : 'var(--color-primary)',
                    minWidth: '36px',
                    textAlign: 'right',
                  }}
                >
                  {value > 0 ? `+${value}` : value}
                  {unit}
                </span>
              )}
              {showReset && onReset && !isAtDefault && (
                <button
                  type="button"
                  onClick={onReset}
                  disabled={disabled || isAtDefault}
                  className="text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 2px',
                    lineHeight: 1,
                    transition: `color var(--duration-hover) var(--easing-out)`,
                  }}
                  aria-label={`Reset ${label ?? 'value'}`}
                  title="Reset to default"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
        )}

        {/* Track */}
        <div className="relative flex items-center" style={{ height: '20px' }}>
          <div
            className="absolute inset-x-0 rounded-full"
            style={{
              height: '4px',
              background: `linear-gradient(to right, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%)`,
              borderRadius: 'var(--radius-full)',
            }}
          />
          <input
            ref={ref}
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              appearance: 'none',
              background: 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
            className="range-slider"
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            {min}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-disabled)' }}>
            {max}
          </span>
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
