export type Platform = 'android' | 'ios' | 'other';

/**
 * Detecta a plataforma a partir do user-agent do navegador.
 * Android tem prioridade (alguns UAs de webview citam ambos).
 */
export function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}
