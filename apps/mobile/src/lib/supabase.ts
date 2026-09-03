import 'react-native-url-polyfill/auto';

import { createSupabaseClient, type SupabaseStorageAdapter } from '@agenda/core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const expoSecureStoreAdapter: SupabaseStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

let client: SupabaseClient | null | undefined;

/**
 * Cliente Supabase criado sob demanda e ciente da plataforma. Retorna null
 * quando as variáveis EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
 * não estão configuradas — o app segue funcional e o login fica indisponível.
 *
 * Web: usa o localStorage padrão (omitindo o storage) + detectSessionInUrl
 * (OAuth/magic-link voltam pela URL). Native: usa expo-secure-store, que NÃO
 * existe na web — passá-lo no browser quebra o carregamento de sessão do
 * Supabase (getValueWithKeyAsync is not a function) e derruba toda a camada de
 * dados. Ver AGENTS.md (client Supabase platform-aware).
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const isWeb = Platform.OS === 'web';
  client =
    url && anonKey
      ? createSupabaseClient({
          url,
          anonKey,
          storage: isWeb ? undefined : expoSecureStoreAdapter,
          detectSessionInUrl: isWeb,
        })
      : null;
  return client;
}

