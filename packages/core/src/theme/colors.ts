/**
 * Espelho TS dos design tokens definidos em src/global.css (@theme).
 * Usar apenas onde className não alcança: cor de ícone, mapStyle,
 * tintColor, placeholderTextColor, gradientes, etc.
 * Fonte da verdade visual: protótipo vibe-noite.lovable.app.
 */
export const colors = {
  background: '#0F0F0F',
  foreground: '#FAFAFA',
  card: '#171717',
  cardForeground: '#FAFAFA',
  popover: '#141414',
  surface: '#1C1C1C',
  surfaceElevated: '#242424',
  muted: '#242424',
  mutedForeground: '#A6A6A6',
  input: '#242424',
  secondary: '#242424',
  border: '#292929',
  primary: '#1DD75E',
  primaryForeground: '#0F0F0F',
  primaryGlow: '#3DF57D',
  accent: '#F9A91F',
  destructive: '#F53D7A',
  neonCyan: '#1FD5F9',
  neonPink: '#FF4DA6',
  ring: '#1DD75E',
  /*
   * Semáforo de eventos/bares. Verde reusa primary; os outros três são
   * próprios porque accent (âmbar) sozinho não separa "falta tempo" de
   * "acabando", e destructive é rosa, não vermelho.
   */
  statusGreen: '#1DD75E',
  statusYellow: '#F5D90A',
  statusOrange: '#F97316',
  statusRed: '#EF4444',
} as const;

export type ThemeColor = keyof typeof colors;
