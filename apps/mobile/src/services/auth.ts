import {
  type AuthProvider,
  AuthUnavailableError,
  getConfiguredSupabase,
  handleServiceError,
  logErrorToTerminal,
  parseAuthTokensFromUrl,
} from '@agenda/core';
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

/**
 * OAuth nativo: abre o browser de autenticação e grava a sessão a partir
 * dos tokens da URL de callback. No web o redirect do browser assume o fluxo.
 */
export async function signInWithProvider(provider: AuthProvider): Promise<void> {
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
