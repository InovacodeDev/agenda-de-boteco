import { useEstablishmentStatusLight } from '@agenda/core';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Linking } from 'react-native';

import { AttributeChips } from '@/components/ui/AttributeChips';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { RatingStars } from '@/components/ui/RatingStars';
import { StatusLightBadge } from '@/components/ui/StatusLightBadge';
import type { Establishment } from '@/data/schemas';
import { colors } from '@/theme/colors';
import { Image, Text, View } from '@/tw';
import { buildInstagramProfileUrl, formatInstagramHandle } from '@/utils/links';

export interface EstablishmentCardProps {
  establishment: Establishment;
}

/** Teto de chips no card; o resto fica para a tela de detalhe. */
const MAX_CARD_ATTRIBUTES = 3;

/** Card compacto de bar (Favoritos, carrossel do mapa). Memoizado para listas. */
export const EstablishmentCard = memo(function EstablishmentCard({
  establishment,
}: EstablishmentCardProps) {
  const router = useRouter();
  const instagramHandle = formatInstagramHandle(establishment.instagram);
  const instagramUrl = buildInstagramProfileUrl(establishment.instagram);
  const statusLight = useEstablishmentStatusLight(establishment.opening_hours);

  return (
    <GuardedPressable
      accessibilityRole="button"
      accessibilityLabel={`Estabelecimento ${establishment.name}`}
      onPress={() => router.push(`/establishment/${establishment.id}`)}
      className="bg-card flex-row gap-3 rounded-2xl p-3 active:opacity-90"
    >
      <Image
        source={{ uri: establishment.logo_url }}
        recyclingKey={establishment.id}
        contentFit="cover"
        className="h-20 w-20 rounded-xl"
        accessibilityLabel={establishment.name}
      />
      <View className="flex-1 justify-center gap-0.5">
        {/* Semáforo no topo: embaixo, junto dos chips, ele quebrava para uma
            segunda linha quando os diferenciais eram longos. */}
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-body text-muted-foreground flex-1 text-[11px]" numberOfLines={1}>
            {establishment.ambiance} · {establishment.price_range}
          </Text>
          <StatusLightBadge light={statusLight} />
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="font-body-semibold text-foreground flex-shrink text-[15px]" numberOfLines={1}>
            {establishment.name}
          </Text>
          {instagramHandle && instagramUrl ? (
            <GuardedPressable
              accessibilityRole="link"
              accessibilityLabel={`Abrir ${instagramHandle} no Instagram`}
              onPress={() => Linking.openURL(instagramUrl)}
              hitSlop={6}
            >
              <Icon name="instagram" color={colors.primary} size={14} />
            </GuardedPressable>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
          <Text className="font-body text-muted-foreground text-[12px]" numberOfLines={1}>
            {establishment.neighborhood}
          </Text>
        </View>
        <AttributeChips attributes={establishment.attributes} max={MAX_CARD_ATTRIBUTES} />
      </View>
    </GuardedPressable>
  );
});
