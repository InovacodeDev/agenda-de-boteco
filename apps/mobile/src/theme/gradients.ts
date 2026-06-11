/**
 * Gradientes do protótipo (CSS linear-gradient não existe em native).
 * Usar com expo-linear-gradient: <LinearGradient {...gradients.promo} />.
 */
import type { LinearGradientProps } from 'expo-linear-gradient';

type GradientSpec = Pick<LinearGradientProps, 'colors' | 'start' | 'end'>;

/** 135deg hsl(141 76% 48%) -> hsl(170 80% 50%) */
export const gradientPrimary: GradientSpec = {
  colors: ['#1DD75E', '#1AE6C3'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

/** 135deg hsl(38 95% 55%) -> hsl(330 100% 65%) — badges Cortesia/Promoção */
export const gradientPromo: GradientSpec = {
  colors: ['#F9A91F', '#FF4DA6'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

/** 160deg hsl(260 40% 12%) -> hsl(0 0% 6%) — fundo onboarding/login */
export const gradientNight: GradientSpec = {
  colors: ['#1A122B', '#0F0F0F'],
  start: { x: 0.2, y: 0 },
  end: { x: 0.8, y: 0.6 },
};

/** 180deg transparente -> preto 85% — overlay sobre imagens dos cards */
export const gradientCardOverlay: GradientSpec = {
  colors: ['transparent', 'rgba(0,0,0,0.85)'],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};
