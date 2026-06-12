import { useRouter } from 'expo-router';
import { memo } from 'react';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { RatingStars } from '@/components/ui/RatingStars';
import type { Establishment } from '@/data/schemas';
import { Image, Text, View } from '@/tw';

export interface EstablishmentCardProps {
  establishment: Establishment;
}

/** Card compacto de bar (Favoritos, carrossel do mapa). Memoizado para listas. */
export const EstablishmentCard = memo(function EstablishmentCard({
  establishment,
}: EstablishmentCardProps) {
  const router = useRouter();
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
        className="h-16 w-16 rounded-xl"
        accessibilityLabel={establishment.name}
      />
      <View className="flex-1 justify-center gap-0.5">
        <Text className="font-body text-muted-foreground text-[11px]">
          {establishment.ambiance} · {establishment.price_range}
        </Text>
        <Text className="font-body-semibold text-foreground text-[15px]" numberOfLines={1}>
          {establishment.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
          <Text className="font-body text-muted-foreground text-[12px]" numberOfLines={1}>
            {establishment.neighborhood}
          </Text>
        </View>
      </View>
    </GuardedPressable>
  );
});
