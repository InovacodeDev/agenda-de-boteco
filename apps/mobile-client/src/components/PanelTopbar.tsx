import { useAuthStore, useOwnedEstablishment } from '@agenda/core';
import { ConfirmDialog, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import { useState } from 'react';

import { signOutAndUnregister } from '@/lib/push';

export function PanelTopbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <View className="flex-row items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
      <Text
        numberOfLines={1}
        className="font-heading text-foreground flex-1 text-base font-semibold"
      >
        {establishment?.name ?? 'Seu estabelecimento'}
      </Text>

      <Pressable
        onPress={() => setConfirmOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Menu da conta"
        className="h-9 w-9 items-center justify-center rounded-full bg-surface-elevated active:opacity-80"
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
