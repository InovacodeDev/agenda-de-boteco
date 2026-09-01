/**
 * Fonte única do basePath do app. É consumido pelo `next.config.ts` (build) e
 * pelo redirect de auth (runtime): em produção a landing faz rewrite de
 * `/app/:path*` para este deploy, então um redirect para a origin nua cai na
 * landing — que não tem client Supabase nem `detectSessionInUrl` e descarta o
 * token, gerando loop de login.
 */
export const BASE_PATH = '/app';

/** Origin + basePath, sem barra final. Vazio no server (não há `window`). */
export function appBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return `${window.location.origin}${BASE_PATH}`;
}
