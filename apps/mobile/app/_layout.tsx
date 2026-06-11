import '../src/global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { handleDeepLink } from '../src/services/auth';
import { useAuthStore } from '../src/store/useAuthStore';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors } from '../src/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hasOnboarded = usePreferencesStore((state) => state.hasOnboarded);
  const hasHydrated = usePreferencesStore((state) => state.hasHydrated);
  const initializeAuth = useAuthStore((state) => state.initialize);

  const url = Linking.useURL();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

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
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={hasOnboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="event/[id]" />
          <Stack.Screen name="establishment/[id]" />
          <Stack.Screen name="city" />
          <Stack.Screen name="login" />
          <Stack.Screen
            name="filters"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: [0.92],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              contentStyle: { backgroundColor: colors.popover },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!hasOnboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
