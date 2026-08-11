import type { Breakpoint } from '../types';

const FACTORS: Record<Breakpoint, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.08,
};

const MIN_FONT_SIZE = 12;

/** Escala um tamanho de fonte base conforme o breakpoint, com clamp mínimo. */
export function scaleFontSize(base: number, breakpoint: Breakpoint): number {
  const scaled = Math.round(base * FACTORS[breakpoint]);
  return Math.max(MIN_FONT_SIZE, scaled);
}
