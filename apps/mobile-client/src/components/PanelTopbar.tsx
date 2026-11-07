import { useAuthStore, useOwnedEstablishment } from '@agenda/core';
import { ConfirmDialog, Image, Pressable, Text, View } from '@agenda/shared-ui-mobile';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { resolveDevAssetUrl } from '@/lib/devUrl';
import { signOutAndUnregister } from '@/lib/push';

export function PanelTopbar() {
  const email = useAuthStore((state) => state.user?.email ?? null);
  const { data: establishment } = useOwnedEstablishment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  const initial = email?.trim().charAt(0).toUpperCase() ?? '?';
  const logoUrl = establishment?.logo_url ? resolveDevAssetUrl(establishment.logo_url) : null;
  const showLogo = Boolean(logoUrl) && failedLogo !== logoUrl;

  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingLeft: 20,
        paddingRight: (isTablet ? insets.right : 0) + 20,
      }}
      className="border-border bg-background min-h-14 flex-row items-center justify-between gap-4 border-b pb-2.5"
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        {showLogo && logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            contentFit="cover"
            onError={() => setFailedLogo(logoUrl)}
            accessibilityIgnoresInvertColors
            className="border-border bg-surface h-9 w-9 rounded-lg border"
          />
        ) : null}
        <Text numberOfLines={1} className="font-heading text-foreground min-w-0 flex-1 text-base">
          {establishment?.name ?? 'Seu estabelecimento'}
        </Text>
      </View>

      <Pressable
        onPress={() => setConfirmOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Menu da conta"
        hitSlop={6}
        className="bg-surface-elevated h-10 w-10 items-center justify-center rounded-full active:opacity-80"
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
