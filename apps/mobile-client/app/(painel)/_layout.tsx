import {
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
  useAuthStore,
} from '@agenda/core';
import { Text, View } from '@agenda/shared-ui-mobile';
import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PanelSidebar } from '@/components/PanelSidebar';
import { PanelTabBar } from '@/components/PanelTabBar';
import { PanelTopbar } from '@/components/PanelTopbar';
import { isBlockedPanelRoute, usePanelFlags } from '@/hooks/usePanelFlags';
import { useResponsive } from '@/hooks/useResponsive';

type OwnerCheck = 'checking' | 'linked' | 'unlinked';

export default function PainelLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const [check, setCheck] = useState<OwnerCheck>('checking');
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const blocked = isBlockedPanelRoute(pathname, usePanelFlags());

  // Tela com flag desligada (deep link, push, rota restaurada): volta ao dashboard, como no web-client.
  useEffect(() => {
    if (blocked) router.replace('/(painel)');
  }, [blocked, router]);

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

  if (check !== 'linked' || blocked) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-body text-muted-foreground text-sm">Carregando painel…</Text>
      </View>
    );
  }

  if (isTablet) {
    return (
      <View className="flex-1 flex-row bg-background">
        <PanelSidebar />
        <View className="flex-1">
          <PanelTopbar />
          <View
            className="flex-1"
            style={{ paddingBottom: insets.bottom, paddingRight: insets.right }}
          >
            <Slot />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{ paddingLeft: insets.left, paddingRight: insets.right }}
    >
      <PanelTopbar />
      <Tabs
        tabBar={() => <PanelTabBar />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: '#0f0f0f' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="events" options={{ title: 'Eventos' }} />
        <Tabs.Screen name="artists" options={{ title: 'Artistas' }} />
        <Tabs.Screen name="profile" options={{ title: 'Perfil', href: null }} />
        <Tabs.Screen name="metrics" options={{ title: 'Métricas', href: null }} />
        <Tabs.Screen name="reviews" options={{ title: 'Avaliações', href: null }} />
        <Tabs.Screen name="settings" options={{ title: 'Configurações', href: null }} />
      </Tabs>
    </View>
  );
}
