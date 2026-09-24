import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'sm' | 'md' | 'lg';

const SM_MAX = 380;
const LG_MIN = 768;

export function resolveBreakpoint(width: number): Breakpoint {
  if (width < SM_MAX) return 'sm';
  if (width < LG_MIN) return 'md';
  return 'lg';
}

export interface ResponsiveInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isSmall: boolean;
  isTablet: boolean;
  isLarge: boolean;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  return {
    width,
    height,
    breakpoint,
    isSmall: breakpoint === 'sm',
    isTablet: width >= LG_MIN,
    isLarge: breakpoint === 'lg',
  };
}
