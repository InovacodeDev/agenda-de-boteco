/**
 * Constantes tipográficas que o CSS não cobre em native.
 * O protótipo usa letter-spacing -2% nos títulos (Space Grotesk);
 * native só aceita letterSpacing em pontos — valores pré-calculados por tamanho.
 */
export const fontFamilies = {
  heading: 'SpaceGrotesk_700Bold',
  headingMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** letterSpacing = -2% do fontSize, como no protótipo */
export const headingLetterSpacing = (fontSize: number): number =>
  Math.round(fontSize * -0.02 * 100) / 100;
