import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { parseAuthTokensFromUrl } from '../utils/auth';
import { handleServiceError, logErrorToTerminal } from '../utils/errors';

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

export async function signInWithEmailOtp(email: string): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: buildRedirectUrl() },
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'auth.signInWithEmailOtp', args: { email } });
  }
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'auth.verifyEmailOtp', args: { email, token } });
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'auth.signOut' });
  }
}

/**
 * Enfileira a exclusão definitiva da conta do usuário autenticado. A anon key
 * não pode apagar `auth.users`; em vez disso chamamos a RPC SECURITY DEFINER
 * `request_account_deletion`, que insere o auth.uid() na fila. Uma rotina
 * agendada (pg_cron, de hora em hora) apaga as contas pendentes — e, por
 * cascata, seus favoritos. Em caso de sucesso, encerra a sessão local.
 *
 * Requer sessão ativa (a RPC valida auth.uid()). Usada tanto pela tela de
 * perfil (usuário já logado) quanto pelo formulário público /excluir-conta
 * (que autentica via OTP antes de chamar).
 */
export async function requestAccountDeletion(): Promise<void> {
  const client = getSupabase();
  if (!client) {
    return;
  }
  try {
    // A RPC vem da migration 20260617120000_account_deletion_queue. O
    // database.types.ts é gerado em CI após aplicar as migrations; até a próxima
    // regeneração, o nome ainda não consta no tipo Functions — daí o cast pontual.
    const rpc = client.rpc as unknown as (
      fn: string,
    ) => PromiseLike<{ error: unknown }>;
    const { error } = await rpc('request_account_deletion');
    if (error) {
      throw error;
    }
    await client.auth.signOut();
  } catch (error) {
    return handleServiceError(error, { method: 'auth.requestAccountDeletion' });
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const client = getSupabase();
  if (!client) {
    return null;
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }
    const user = data.session?.user;
    return user ? mapUser(user) : null;
  } catch (error) {
    return handleServiceError(error, { method: 'auth.getCurrentUser' });
  }
}

/** Observa mudanças de sessão; retorna função de unsubscribe */
export function onAuthUserChange(callback: (user: AuthUser | null) => void): () => void {
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
