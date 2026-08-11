import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes condicionais (clsx) e resolve conflitos de
 * utilitários Tailwind (tailwind-merge), mantendo a última ocorrência.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
