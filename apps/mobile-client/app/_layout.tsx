import '../src/global.css';
import '@/store/storage';
import '@/lib/bootstrap';

import {
  CACHE_BUSTER,
  getCurrentUserExternalId,
  identifyAnalyticsUser,
  onAuthUserChange,
  queryClient,
  resetAnalytics,
  setupFocusManager,
  setupOnlineManager,
  shouldDehydrateQuery,
  trackPageview,
  useAuthStore,
} from '@agenda/core';
import { ToastProvider } from '@agenda/shared-ui-mobile';
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
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { usePushNotifications } from '@/lib/push';
import { persister } from '@/lib/queryPersister';

SplashScreen.preventAutoHideAsync();

function PostHogScreenTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let lastUserId: string | null = useAuthStore.getState().user?.id ?? null;
    return onAuthUserChange((user) => {
      const nextUserId = user?.id ?? null;
      if (nextUserId !== null && nextUserId !== lastUserId) {
        // Mesmo distinct_id do web-client (external_id, nunca auth.uid()): o
        // dono vira uma só pessoa no PostHog e recebe as mesmas flags nos dois painéis.
        void getCurrentUserExternalId()
          .then((externalId) => {
            if (externalId) identifyAnalyticsUser(externalId);
          })
          .catch(() => {});
      } else if (nextUserId === null && lastUserId !== null) {
        resetAnalytics();
      }
      lastUserId = nextUserId;
    });
  }, []);

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

  usePushNotifications(fontsLoaded);

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
        <ToastProvider>
          <StatusBar style="light" />
          <PostHogScreenTracker />
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
        </ToastProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
