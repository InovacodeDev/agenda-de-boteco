import 'react-native-url-polyfill/auto';

import { createSupabaseClient, type SupabaseStorageAdapter } from 'core';
import * as SecureStore from 'expo-secure-store';

const expoSecureStoreAdapter: SupabaseStorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createSupabaseClient({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  storage: expoSecureStoreAdapter,
  detectSessionInUrl: false,
});
