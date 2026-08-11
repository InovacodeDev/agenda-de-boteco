const UNSPLASH_BASE = 'https://images.unsplash.com/photo-';

/**
 * Monta a URL de imagem do Unsplash no mesmo formato do protótipo:
 * photo-{id}?auto=format&fit=crop&w={w}&h={h}&q=80
 */
export function buildUnsplashUrl(photoId: string, w = 1200, h = 700): string {
  return `${UNSPLASH_BASE}${photoId}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}
