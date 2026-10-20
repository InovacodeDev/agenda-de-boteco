import 'react-native-url-polyfill/auto';

import { createSupabaseClient, type SupabaseStorageAdapter } from '@agenda/core';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { resolveDevSupabaseUrl } from './devUrl';

const expoSecureStoreAdapter: SupabaseStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

type SupabaseClient = ReturnType<typeof createSupabaseClient>;

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) {
    return client;
  }
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const url = resolveDevSupabaseUrl(rawUrl);
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const isWeb = Platform.OS === 'web';
  if (__DEV__ && url && url !== rawUrl) {
    console.log(`[Supabase] Connecting to local dev Supabase at: ${url}`);
  }
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
