import {
  type AuthProvider,
  AuthUnavailableError,
  getConfiguredSupabase,
  handleServiceError,
  logErrorToTerminal,
  parseAuthTokensFromUrl,
} from '@agenda/core';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

function requireClient() {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new AuthUnavailableError();
  }
  return client;
}

/** Erro do expo-apple-authentication quando o usuário fecha o modal. */
const APPLE_CANCELED = 'ERR_REQUEST_CANCELED';

function isAppleCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === APPLE_CANCELED
  );
}

/**
 * Sign in with Apple nativo: a App Store exige Apple sempre que há login
 * social (Guideline 4.8) e o fluxo por browser não devolve `success` no
 * iPadOS. A Apple só envia `fullName` no primeiro login, por isso ele é
 * gravado no metadata na mesma passada.
 */
async function signInWithAppleNative(): Promise<void> {
  const client = requireClient();

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple não retornou o token de identidade.');
  }

  const { error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) {
    throw error;
  }

  const givenName = credential.fullName?.givenName ?? null;
  const familyName = credential.fullName?.familyName ?? null;
  const fullName = [givenName, familyName].filter(Boolean).join(' ');
  if (fullName) {
    await client.auth.updateUser({
      data: { full_name: fullName, given_name: givenName, family_name: familyName },
    });
  }
}

/**
 * OAuth nativo. O `signInWithOAuth` do core só redireciona a janela (fluxo
 * web); no app é preciso abrir a sessão de autenticação do sistema e gravar
 * a sessão a partir dos tokens da URL de callback. Cancelar não é erro.
 */
export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  if (provider === 'apple' && Platform.OS === 'ios') {
    try {
      return await signInWithAppleNative();
    } catch (error) {
      if (isAppleCancellation(error)) {
        return;
      }
      return handleServiceError(error, {
        method: 'mobileClientAuth.signInWithProvider',
        args: { provider },
      });
    }
  }

  const client = requireClient();
  const redirectTo = Linking.createURL('/');

  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });
    if (error) {
      throw error;
    }
    if (Platform.OS === 'web' || !data.url) {
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      return;
    }
    const tokens = parseAuthTokensFromUrl(result.url);
    if (tokens) {
      const { error: sessionError } = await client.auth.setSession(tokens);
      if (sessionError) {
        throw sessionError;
      }
    }
  } catch (error) {
    return handleServiceError(error, {
      method: 'mobileClientAuth.signInWithProvider',
      args: { provider },
    });
  }
}

export type AuthDeepLinkResult = 'recovery' | 'session' | null;

function readUrlParam(url: string, key: string): string | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const query =
    queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : '';
  return new URLSearchParams(fragment).get(key) ?? new URLSearchParams(query).get(key);
}

/**
 * Grava a sessão vinda de um link de e-mail (recuperação de senha, confirmação)
 * e diz ao caller se é recuperação, para abrir `/new-password`. A URL carrega
 * tokens: nunca vai para `args` do log.
 */
export async function handleAuthDeepLink(url: string): Promise<AuthDeepLinkResult> {
  const client = getConfiguredSupabase();
  if (!client) {
    return null;
  }
  const tokens = parseAuthTokensFromUrl(url);
  if (!tokens) {
    return null;
  }
  try {
    const { error } = await client.auth.setSession(tokens);
    if (error) {
      throw error;
    }
  } catch (error) {
    logErrorToTerminal(error, { method: 'mobileClientAuth.handleAuthDeepLink' });
    return null;
  }
  return readUrlParam(url, 'type') === 'recovery' ? 'recovery' : 'session';
}
