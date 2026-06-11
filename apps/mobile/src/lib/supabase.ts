import 'react-native-url-polyfill/auto';

import { createSupabaseClient, type SupabaseStorageAdapter } from 'core';
import * as SecureStore from 'expo-secure-store';

const expoSecureStoreAdapter: SupabaseStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

let client: SupabaseClient | null | undefined;

/**
 * Cliente Supabase criado sob demanda. Retorna null quando as variáveis
 * EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY não estão
 * configuradas — o app segue funcional e o login fica indisponível.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  client =
    url && anonKey
      ? createSupabaseClient({
          url,
          anonKey,
          storage: expoSecureStoreAdapter,
          detectSessionInUrl: false,
        })
      : null;
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
