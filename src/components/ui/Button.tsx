import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

// --------------------------------------------------------------------------
// Button Variants (CVA)
// --------------------------------------------------------------------------

const buttonVariants = cva(
  // Base styles — match design system exactly
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all select-none whitespace-nowrap',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'cursor-pointer',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--color-primary)] text-white',
          'hover:bg-[var(--color-primary-hover)]',
          'active:scale-[0.98]',
          'shadow-[var(--shadow-sm)]',
        ],
        secondary: [
          'bg-[var(--color-surface)] text-[var(--color-text-primary)]',
          'border border-[var(--color-border)]',
          'hover:bg-[var(--color-surface-secondary)] hover:border-[var(--color-divider)]',
          'active:scale-[0.98]',
          'shadow-[var(--shadow-sm)]',
        ],
        ghost: [
          'bg-transparent text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
          'active:scale-[0.98]',
        ],
        danger: [
          'bg-[var(--color-error)] text-white',
          'hover:opacity-90',
          'active:scale-[0.98]',
          'shadow-[var(--shadow-sm)]',
        ],
        tool: [
          'bg-transparent text-[var(--color-text-muted)]',
          'hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]',
          'data-[active=true]:bg-[var(--color-primary-light)] data-[active=true]:text-[var(--color-primary)]',
          'active:scale-[0.95]',
        ],
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-[var(--radius-sm)]',
        sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
        md: 'h-9 px-4 text-sm rounded-[var(--radius-md)]',
        lg: 'h-11 px-5 text-base rounded-[var(--radius-md)]',
        icon: 'h-9 w-9 rounded-[var(--radius-sm)]',
        'icon-sm': 'h-8 w-8 rounded-[var(--radius-sm)]',
        'icon-lg': 'h-11 w-11 rounded-[var(--radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

// --------------------------------------------------------------------------
// Button Component
// --------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isActive?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      isActive,
      children,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        data-active={isActive}
        style={{
          transition: `background-color var(--duration-hover) var(--easing-out),
                       color var(--duration-hover) var(--easing-out),
                       border-color var(--duration-hover) var(--easing-out),
                       transform var(--duration-press) var(--easing-out),
                       opacity var(--duration-hover) var(--easing-out)`,
          ...style,
        }}
        {...props}
      >
        {isLoading ? (
          <span
            className="animate-spin"
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
