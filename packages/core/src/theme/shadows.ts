/**
 * Sombras do protótipo. As utilities shadow-* do Tailwind compõem variáveis
 * --tw-* que o runtime native não resolve; RN 0.85 (new arch) aceita a prop
 * de estilo boxShadow como string em iOS e Android.
 * Uso: <View style={{ boxShadow: shadows.card }} />.
 */
export const shadows = {
  /** 0 12px 30px -10px hsl(0 0% 0% / .6) */
  card: '0 12px 30px -10px rgba(0,0,0,0.6)',
  /** 0 10px 40px -10px hsl(141 76% 48% / .45) — glow verde dos CTAs */
  neon: '0 10px 40px -10px rgba(29,215,94,0.45)',
} as const;
