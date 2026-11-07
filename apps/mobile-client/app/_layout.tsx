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
import { ErrorBoundary, OfflineBanner, ToastProvider } from '@agenda/shared-ui-mobile';
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
import * as Linking from 'expo-linking';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { handleAuthDeepLink } from '@/lib/auth';
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

/**
 * Links de e-mail do Supabase (recuperação de senha, confirmação) chegam com
 * os tokens na URL; no nativo não há `detectSessionInUrl`, então a sessão é
 * gravada aqui e a recuperação segue para `/new-password`.
 */
function AuthDeepLinkHandler() {
  const url = Linking.useURL();
  const router = useRouter();

  useEffect(() => {
    if (!url) return;
    let active = true;
    void handleAuthDeepLink(url).then((result) => {
      if (active && result === 'recovery') router.replace('/new-password');
    });
    return () => {
      active = false;
    };
  }, [url, router]);

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
      const sub = AppState.addEventListener('change', (status) => listener(status === 'active'));
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
  useRealtimeSync();

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
        <ErrorBoundary>
          <ToastProvider>
            <StatusBar style="light" />
            <PostHogScreenTracker />
            <AuthDeepLinkHandler />
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
            <OfflineBanner />
          </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
