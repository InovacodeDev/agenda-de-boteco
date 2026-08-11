import '../src/global.css';
// bootstrap: configura o storage do persist (configureAppStorage) — NÃO remover
import '@/store/storage';
// bootstrap: registra client supabase, redirect de auth e handler de erro — NÃO remover
import '@/lib/bootstrap';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { queryClient } from '@/lib/queryClient';
import { persister } from '@/lib/queryPersister';
import { handleDeepLink, onAuthUserChange } from '@/services/auth';
import { CACHE_BUSTER, shouldDehydrateQuery } from '@/services/cachePolicy';
import { setupFocusManager, setupOnlineManager } from '@/services/connectivity';
import { useAuthStore } from '@/store/useAuthStore';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

/** Liga o realtime ao cache. Montado dentro do provider para garantir contexto. */
function RealtimeBridge() {
  useRealtimeSync();
  return null;
}

export default function RootLayout() {
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const initializeAuth = useAuthStore((state) => state.initialize);

  const url = Linking.useURL();

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

  useEffect(() => {
    const { flushQueue, mergeLocalIntoServer } = useFavoritesStore.getState();
    let lastUserId: string | null = useAuthStore.getState().user?.id ?? null;
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        flushQueue(useAuthStore.getState().user?.id ?? null);
      }
    });
    const unsubscribeAuth = onAuthUserChange((user) => {
      const nextUserId = user?.id ?? null;
      if (nextUserId !== null && nextUserId !== lastUserId) {
        mergeLocalIntoServer(nextUserId);
      }
      lastUserId = nextUserId;
    });
    return () => {
      unsubscribeOnline();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const ready = fontsLoaded && hasHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Splash segura até fontes + hidratação do persist (evita flash da tela errada)
  if (!ready) {
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
          <RealtimeBridge />
          <StatusBar style="light" />
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="establishment/[id]" />
            <Stack.Screen name="city" />
            <Stack.Screen name="login" />
            {/* Rotas públicas: acessíveis sem onboarding (URLs exigidas pelas lojas + crawler). */}
            <Stack.Screen name="privacidade" />
            <Stack.Screen name="excluir-conta" />
          </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
