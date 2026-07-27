/**
 * Mapeamento de paths web (slug-based) para rotas internas do expo-router.
 *
 * Tabela de roteamento (ordem de avaliação):
 *  1. URLs de auth (contêm `access_token`/`refresh_token`/`code`) → INTACTAS.
 *     O fluxo de auth depende de receber a URL original (tokens em query/hash).
 *  2. `/eventos/{cidade}/{slug}` → `/event/{slug}`   (reescrita web → app).
 *  3. `/bares/{cidade}/{slug}`   → `/establishment/{slug}` (reescrita web → app).
 *  4. Paths que JÁ são rotas internas conhecidas → INTACTOS. Inclui o próprio
 *     deep link de scheme (`agenda-de-boteco://event/e1` chega aqui como
 *     `/event/e1`, que já é rota válida e não pode virar `/`).
 *  5. Qualquer outro path desconhecido → `/` (home).
 *
 * Parsing simples e seguro por split('/') — sem dependências de runtime.
 */

/** Parâmetros OAuth/Supabase que indicam uma URL de autenticação. */
const AUTH_PARAMS = ['access_token', 'refresh_token', 'code'] as const;

/**
 * Rotas internas conhecidas que devem passar intactas.
 * - Prefixos com segmentos dinâmicos: `/event/`, `/establishment/`.
 * - Rotas exatas (sem segmentos extras): home e telas de nível superior.
 */
const INTERNAL_DYNAMIC_PREFIXES = ['/event/', '/establishment/'] as const;
const INTERNAL_EXACT_ROUTES = [
  '/',
  '/city',
  '/login',
  '/onboarding',
  '/favorites',
  '/notifications',
  '/map',
  '/profile',
] as const;

function isAuthUrl(path: string): boolean {
  return AUTH_PARAMS.some((param) => path.includes(`${param}=`));
}

/** Separa o path da query/hash para inspecionar apenas os segmentos. */
function pathnameOf(path: string): string {
  const queryIndex = path.indexOf('?');
  const hashIndex = path.indexOf('#');
  const cutCandidates = [queryIndex, hashIndex].filter((i) => i >= 0);
  const cut = cutCandidates.length > 0 ? Math.min(...cutCandidates) : path.length;
  return path.slice(0, cut);
}

function isInternalRoute(pathname: string): boolean {
  if (INTERNAL_EXACT_ROUTES.includes(pathname as (typeof INTERNAL_EXACT_ROUTES)[number])) {
    return true;
  }
  return INTERNAL_DYNAMIC_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix) && pathname.length > prefix.length,
  );
}

/**
 * Mapeia um path recebido pelo app para uma rota interna do expo-router.
 * Função pura — sem efeitos colaterais nem leitura de ambiente.
 */
export function mapWebPathToRoute(path: string): string {
  // 1. URLs de auth passam intactas (não interceptar o fluxo de tokens).
  if (isAuthUrl(path)) {
    return path;
  }

  const pathname = pathnameOf(path);
  // Segmentos do path, descartando vazios (lida com barra inicial/final e //).
  const segments = pathname.split('/').filter((segment) => segment.length > 0);

  // 2 e 3. Reescrita de paths web slug-based.
  if (segments.length >= 2) {
    const [first, , third] = segments;
    const slug = third ?? segments[1];
    if (first === 'eventos') {
      return `/event/${slug}`;
    }
    if (first === 'bares') {
      return `/establishment/${slug}`;
    }
  }

  // 4. Paths que já são rotas internas conhecidas passam intactos
  //    (preserva a query string original quando aplicável).
  if (isInternalRoute(pathname)) {
    return path;
  }

  // 5. Desconhecido → home.
  return '/';
}
