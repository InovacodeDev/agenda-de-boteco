import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { parseAuthTokensFromUrl } from '../utils/auth';

export type AuthProvider = 'google' | 'apple';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** Login indisponível: Supabase ainda não configurado neste ambiente */
export class AuthUnavailableError extends Error {
  constructor() {
    super('Auth indisponível: Supabase não configurado');
    this.name = 'AuthUnavailableError';
  }
}

export function isAuthAvailable(): boolean {
  return isSupabaseConfigured();
}

function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new AuthUnavailableError();
  }
  return client;
}

interface SupabaseUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

function mapUser(user: SupabaseUserLike): AuthUser {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return {
    id: user.id,
    email: user.email ?? null,
    name: typeof metadataName === 'string' ? metadataName : null,
  };
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
}

export async function signInWithEmailOtp(email: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: buildRedirectUrl() },
  });
  if (error) {
    throw error;
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabase();
  if (!client) {
    return;
  }
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getSupabase();
  if (!client) {
    return null;
  }
  const { data } = await client.auth.getSession();
  const user = data.session?.user;
  return user ? mapUser(user) : null;
}

/** Observa mudanças de sessão; retorna função de unsubscribe */
export function onAuthUserChange(
  callback: (user: AuthUser | null) => void,
): () => void {
  const client = getSupabase();
  if (!client) {
    return () => undefined;
  }
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

export async function handleDeepLink(url: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) {
    return false;
  }
  const tokens = parseAuthTokensFromUrl(url);
  if (tokens) {
    const { error } = await client.auth.setSession(tokens);
    if (!error) {
      return true;
    }
  }
  return false;
}
