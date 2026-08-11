export interface DirectionsDestination {
  lat: number;
  lng: number;
  /** Apenas informativo (acessibilidade/analytics) — não entra na URL. */
  label?: string;
}

/** URL universal de rotas do Google Maps (funciona em iOS, Android e web). */
export function buildDirectionsUrl(dest: DirectionsDestination): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`;
}

/** Link wa.me, com texto pré-preenchido URL-encoded quando fornecido. */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${phone}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * URL do perfil no Instagram a partir do handle cadastrado (com ou sem `@`).
 * Devolve `undefined` quando não há handle utilizável — o call-site esconde o
 * link em vez de abrir instagram.com/ vazio.
 */
export function buildInstagramProfileUrl(handle?: string): string | undefined {
  const username = handle?.trim().replace(/^@+/, '').replace(/\/+$/, '');
  if (!username) return undefined;
  return `https://instagram.com/${encodeURIComponent(username)}`;
}

/** Handle normalizado para exibição (`@perfil`), ou `undefined` se vazio. */
export function formatInstagramHandle(handle?: string): string | undefined {
  const username = handle?.trim().replace(/^@+/, '').replace(/\/+$/, '');
  return username ? `@${username}` : undefined;
}

/** Scheme custom do app (deep link nativo). */
export const APP_SCHEME = 'agenda-de-boteco';

export interface ShareTarget {
  /** slug quando disponível; quando ausente, é o próprio id. */
  slugOrId: string;
  /** slug da cidade — usado apenas no formato https público. */
  citySlug?: string;
}

/** Remove a barra final do baseUrl para evitar dupla barra ao concatenar. */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Monta a URL de compartilhamento de um evento.
 * - Sem `baseUrl` → deep link nativo `agenda-de-boteco://event/{slugOrId}`.
 * - Com `baseUrl` → URL https pública `{baseUrl}/eventos/{citySlug}/{slug}`
 *   (o segmento `citySlug` é omitido quando ausente).
 * Os segmentos de path são URL-encoded.
 */
export function buildEventShareUrl(target: ShareTarget, baseUrl?: string): string {
  const slug = encodeURIComponent(target.slugOrId);
  if (!baseUrl) {
    return `${APP_SCHEME}://event/${slug}`;
  }
  const base = normalizeBaseUrl(baseUrl);
  const citySegment = target.citySlug
    ? `${encodeURIComponent(target.citySlug)}/`
    : '';
  return `${base}/eventos/${citySegment}${slug}`;
}

/**
 * Monta a URL de compartilhamento de um estabelecimento.
 * - Sem `baseUrl` → deep link nativo `agenda-de-boteco://establishment/{slugOrId}`.
 * - Com `baseUrl` → URL https pública `{baseUrl}/bares/{citySlug}/{slug}`
 *   (o segmento `citySlug` é omitido quando ausente).
 * Os segmentos de path são URL-encoded.
 */
export function buildEstablishmentShareUrl(
  target: ShareTarget,
  baseUrl?: string,
): string {
  const slug = encodeURIComponent(target.slugOrId);
  if (!baseUrl) {
    return `${APP_SCHEME}://establishment/${slug}`;
  }
  const base = normalizeBaseUrl(baseUrl);
  const citySegment = target.citySlug
    ? `${encodeURIComponent(target.citySlug)}/`
    : '';
  return `${base}/bares/${citySegment}${slug}`;
}
