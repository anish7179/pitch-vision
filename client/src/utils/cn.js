import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges standard Tailwind classes with conditional classes,
 * resolving any Tailwind CSS conflicts automatically.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
