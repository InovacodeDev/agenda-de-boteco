/**
 * Allowlist de paths que o app do dono aceita por deep link. Deep link é
 * entrada não confiável: tudo fora da lista cai em `/`, e o guard de cada tela
 * continua decidindo o acesso. O grupo `(painel)` não aparece na URL.
 *
 * URLs de auth (tokens/código do Supabase no hash ou na query) passam
 * intactas: quem consome os tokens é `handleAuthDeepLink`, no layout raiz.
 */
const AUTH_PARAMS = ['access_token', 'refresh_token', 'code'] as const;

const EXACT_ROUTES = [
  '/',
  '/login',
  '/onboarding',
  '/new-password',
  '/privacy',
  '/delete-account',
  '/events',
  '/events/new',
  '/artists',
  '/metrics',
  '/reviews',
  '/profile',
  '/settings',
] as const;

/** `/events/{id}` (edição); o id é validado pela própria tela via query. */
const EVENT_DETAIL = /^\/events\/[A-Za-z0-9-]+$/;

function isAuthUrl(path: string): boolean {
  return AUTH_PARAMS.some((param) => path.includes(`${param}=`));
}

function isRecoverySuffix(suffix: string): boolean {
  const hashIndex = suffix.indexOf('#');
  const queryIndex = suffix.indexOf('?');
  const fragment = hashIndex >= 0 ? suffix.slice(hashIndex + 1) : '';
  const query =
    queryIndex >= 0 ? suffix.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : '';
  return (
    new URLSearchParams(fragment).get('type') === 'recovery' ||
    new URLSearchParams(query).get('type') === 'recovery'
  );
}

function splitPath(path: string): { pathname: string; suffix: string } {
  const cuts = [path.indexOf('?'), path.indexOf('#')].filter((index) => index >= 0);
  const cut = cuts.length > 0 ? Math.min(...cuts) : path.length;
  const pathname = path.slice(0, cut).replace(/\/+$/, '');
  return {
    pathname: pathname.length > 0 ? pathname : '/',
    suffix: path.slice(cut),
  };
}

export function mapIncomingPathToRoute(path: string): string {
  const { pathname, suffix } = splitPath(path);
  if (isAuthUrl(path)) {
    if (isRecoverySuffix(suffix)) {
      return `/new-password${suffix}`;
    }
    const target = (EXACT_ROUTES as readonly string[]).includes(pathname) ? pathname : '/';
    return `${target}${suffix}`;
  }
  if ((EXACT_ROUTES as readonly string[]).includes(pathname) || EVENT_DETAIL.test(pathname)) {
    return path;
  }
  return '/';
}
