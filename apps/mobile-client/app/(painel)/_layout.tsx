import {
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
  useAuthStore,
} from '@agenda/core';
import { Icon, Text, View } from '@agenda/shared-ui-mobile';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';

type OwnerCheck = 'checking' | 'linked' | 'unlinked';

const TAB_BAR_BASE_HEIGHT = 56;

export default function PainelLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((state) => state.status);
  const [check, setCheck] = useState<OwnerCheck>('checking');
  const { isTablet } = useResponsive();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
      return;
    }
    let active = true;
    void (async () => {
      const isOwner = await isCurrentUserEstablishmentOwner();
      if (!active) return;
      if (!isOwner) {
        router.replace('/login');
        return;
      }
      const id = await getOwnedEstablishmentId();
      if (!active) return;
      if (id) {
        queueMicrotask(() => setCheck('linked'));
        return;
      }
      queueMicrotask(() => setCheck('unlinked'));
      router.replace('/onboarding');
    })();

    return () => {
      active = false;
    };
  }, [status, router]);

  if (check !== 'linked') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-body text-muted-foreground text-sm">Carregando painel…</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#0f0f0f' },
        tabBarStyle: {
          backgroundColor: '#141414',
          borderTopColor: '#292929',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: (isTablet ? 64 : TAB_BAR_BASE_HEIGHT) + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#1dd75e',
        tabBarInactiveTintColor: '#a6a6a6',
        tabBarLabelStyle: {
          fontSize: isTablet ? 13 : 11,
          fontFamily: 'Inter_500Medium',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="squares-four" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-blank" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="artists"
        options={{
          title: 'Artistas',
          tabBarIcon: ({ color, size }) => (
            <Icon name="microphone" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Métricas',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-bar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="store" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Icon name="gear" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
