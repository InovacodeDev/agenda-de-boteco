import '../src/global.css';
import '@/store/storage';
import '@/lib/bootstrap';

import {
  CACHE_BUSTER,
  queryClient,
  setupFocusManager,
  setupOnlineManager,
  shouldDehydrateQuery,
  useAuthStore,
} from '@agenda/core';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import NetInfo from '@react-native-community/netinfo';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { persister } from '@/lib/queryPersister';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const teardownOnline = setupOnlineManager((listener) =>
      NetInfo.addEventListener((state) =>
        listener({
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
        }),
      ),
    );
    const teardownFocus = setupFocusManager((listener) => {
      const sub = AppState.addEventListener('change', (status) =>
        listener(status === 'active'),
      );
      return () => sub.remove();
    });
    return () => {
      teardownOnline();
      teardownFocus();
    };
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f0f0f' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(painel)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="new-password" />
        </Stack>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
