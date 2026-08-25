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

export * from '@agenda/core';

function requireClient() {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new AuthUnavailableError();
  }
  return client;
}

function buildRedirectUrl(): string {
  return Linking.createURL('/');
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
 * Sign in with Apple nativo (ASAuthorizationController). Substitui o fluxo
 * OAuth por browser no iOS: o WebBrowser não devolvia `success` no iPadOS,
 * então a sessão nunca era gravada e a tela de login reaparecia — o loop que
 * motivou a rejeição da App Review (guideline 2.1). A Apple também exige o
 * fluxo nativo em apps iOS, não a webview.
 *
 * A Apple envia `fullName` apenas no primeiro login; por isso ele é gravado
 * no metadata do usuário na mesma passada.
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
 * OAuth nativo: abre o browser de autenticação e grava a sessão a partir
 * dos tokens da URL de callback. No web o redirect do browser assume o fluxo.
 * No iOS, Apple usa o fluxo nativo (ver `signInWithAppleNative`).
 */
export async function signInWithProvider(provider: AuthProvider): Promise<void> {
  if (provider === 'apple' && Platform.OS === 'ios') {
    try {
      return await signInWithAppleNative();
    } catch (error) {
      // Cancelar não é falha: sai em silêncio, sem mensagem de erro na tela.
      if (isAppleCancellation(error)) {
        return;
      }
      return handleServiceError(error, { method: 'auth.signInWithProvider', args: { provider } });
    }
  }

  const client = requireClient();
  const redirectTo = buildRedirectUrl();

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
    return handleServiceError(error, { method: 'auth.signInWithProvider', args: { provider } });
  }
}

export async function handleDeepLink(url: string): Promise<boolean> {
  const client = getConfiguredSupabase();
  if (!client) {
    return false;
  }
  const tokens = parseAuthTokensFromUrl(url);
  if (tokens) {
    try {
      const { error } = await client.auth.setSession(tokens);
      if (error) {
        throw error;
      }
      return true;
    } catch (error) {
      logErrorToTerminal(error, { method: 'auth.handleDeepLink', args: { url } });
      return false;
    }
  }
  return false;
}
