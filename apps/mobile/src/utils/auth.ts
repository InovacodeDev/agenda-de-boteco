export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/**
 * Extrai os tokens de sessão da URL de callback do OAuth (Supabase devolve
 * no fragmento `#access_token=...` ou na query string). Retorna null quando
 * a URL não contém um par completo de tokens.
 */
export function parseAuthTokensFromUrl(url: string): AuthTokens | null {
  const hashIndex = url.indexOf('#');
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const queryIndex = url.indexOf('?');
  const query =
    queryIndex >= 0
      ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
      : '';

  const fragmentParams = new URLSearchParams(fragment);
  const queryParams = new URLSearchParams(query);

  const accessToken =
    fragmentParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken =
    fragmentParams.get('refresh_token') ?? queryParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }
  return { access_token: accessToken, refresh_token: refreshToken };
}
