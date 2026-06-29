import type { Breakpoint } from '@agenda/core';
import { useWindowDimensions } from 'react-native';

export type { Breakpoint };

const SM_MAX = 380;
const LG_MIN = 768;

/** Faixa de viewport a partir da largura em dp. Pura — testável isoladamente. */
export function resolveBreakpoint(width: number): Breakpoint {
  if (width < SM_MAX) {
    return 'sm';
  }
  if (width < LG_MIN) {
    return 'md';
  }
  return 'lg';
}

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isSmall: boolean;
  isLarge: boolean;
}

/** Informações de viewport reativas a rotação/redimensionamento. */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  return {
    width,
    height,
    breakpoint,
    isSmall: breakpoint === 'sm',
    isLarge: breakpoint === 'lg',
  };
}
