import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types';

export interface SupabaseStorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface CreateSupabaseClientOptions {
  url: string;
  anonKey: string;
  /** Persistence adapter. Omit on web to use the default localStorage. */
  storage?: SupabaseStorageAdapter;
  /** Web (OAuth/magic-link) reads the session from the URL; native does not. */
  detectSessionInUrl?: boolean;
}

export function createSupabaseClient({
  url,
  anonKey,
  storage,
  detectSessionInUrl = false,
}: CreateSupabaseClientOptions): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      'createSupabaseClient: "url" and "anonKey" are required. ' +
        'Pass them from the app env (EXPO_PUBLIC_* on Expo, VITE_* on Vite).',
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      ...(storage ? { storage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl,
    },
  });
}

let getter: (() => SupabaseClient<Database> | null) | null = null;

/** Cada app registra seu getter de client no bootstrap (mobile = expo-secure-store, web = localStorage). */
export function configureSupabase(fn: () => SupabaseClient<Database> | null): void {
  getter = fn;
}

/** Client configurado, ou null se não houver (mantém o app funcional sem login). */
export function getConfiguredSupabase(): SupabaseClient<Database> | null {
  return getter ? getter() : null;
}

/** Conveniência: há client configurado? */
export function isSupabaseConfigured(): boolean {
  return getConfiguredSupabase() !== null;
}
