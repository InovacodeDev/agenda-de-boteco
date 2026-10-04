import { useAuthStore, useOwnedEstablishment } from '@agenda/core';
import { ConfirmDialog, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { signOutAndUnregister } from '@/lib/push';

export function PanelTopbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingLeft: 20,
        paddingRight: (isTablet ? insets.right : 0) + 20,
      }}
      className="min-h-14 flex-row items-center justify-between gap-4 border-b border-border bg-background pb-2.5"
    >
      <Text
        numberOfLines={1}
        className="font-heading text-foreground min-w-0 flex-1 text-base"
      >
        {establishment?.name ?? 'Seu estabelecimento'}
      </Text>

      <Pressable
        onPress={() => setConfirmOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Menu da conta"
        hitSlop={6}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-elevated active:opacity-80"
      >
        <Text className="font-body-medium text-foreground text-sm">{initial}</Text>
      </Pressable>

      <ConfirmDialog
        visible={confirmOpen}
        title="Sair da conta"
        message="Você precisará entrar novamente para acessar o painel."
        confirmLabel="Sair"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void signOutAndUnregister();
        }}
      />
    </View>
  );
}
