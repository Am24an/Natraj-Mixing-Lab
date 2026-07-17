import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names safely, resolving conflicts.
 * Used throughout the component library.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
