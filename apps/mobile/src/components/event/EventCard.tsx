import { haversineDistanceKm, type LatLng, trackEvent, useEventStatusLight } from '@agenda/core';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, type ReactNode, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { AttributeChips } from '@/components/ui/AttributeChips';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { StatusLightBadge } from '@/components/ui/StatusLightBadge';
import type { Establishment, Event, MusicStyle } from '@/data/schemas';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { gradientCardOverlay } from '@/theme/gradients';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, Text, View } from '@/tw';
import { formatRelativeDay, formatTimeRange } from '@/utils/dates';
import { formatPrice } from '@/utils/format';
import { buildInstagramProfileUrl, formatInstagramHandle } from '@/utils/links';

interface FooterItemProps {
  icon: ReactNode;
  children: ReactNode;
}

function FooterItem({ icon, children }: FooterItemProps) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      {children}
    </View>
  );
}

export interface EventCardProps {
  event: Event;
  establishment: Establishment;
  styles: MusicStyle[];
  userCoords?: LatLng | null;
}

/** Teto de chips no card; o resto fica para a tela de detalhe do bar. */
const MAX_CARD_ATTRIBUTES = 3;

/**
 * Card de evento do feed, fiel ao protótipo. Memoizado: nas listas, só
 * re-renderiza quando event/establishment/styles mudam de referência.
 */
export const EventCard = memo(function EventCard({
  event,
  establishment,
  styles,
  userCoords,
}: EventCardProps) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const isFavorite = useFavoritesStore((state) => state.eventIds.includes(event.id));
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  const badge = event.courtesy ? 'Cortesia' : event.promo ? 'Promoção' : null;
  const price = formatPrice(event.cover_charge);
  const statusLight = useEventStatusLight(event.starts_at, event.ends_at);

  const distanceText = useMemo(() => {
    if (!userCoords) return null;
    const dist = haversineDistanceKm(
      { lat: establishment.lat, lng: establishment.lng },
      userCoords,
    );
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m de mim`;
    }
    return `${dist.toFixed(1).replace('.', ',')}km de mim`;
  }, [establishment.lat, establishment.lng, userCoords]);

  const instagramHandle = formatInstagramHandle(establishment.instagram);
  const instagramUrl = buildInstagramProfileUrl(establishment.instagram);

  return (
    <GuardedPressable
      accessibilityRole="button"
      accessibilityLabel={`Evento ${event.name} no ${establishment.name}`}
      onPress={() => router.push(`/event/${event.id}`)}
      className="bg-card overflow-hidden rounded-2xl active:opacity-90"
    >
      <View className="h-[340px]">
        <Image
          source={{ uri: event.banner_url }}
          recyclingKey={event.id}
          contentFit="cover"
          transition={200}
          className="absolute inset-0"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={event.name}
        />
        <LinearGradient {...gradientCardOverlay} style={StyleSheet.absoluteFill} />

        <View className="flex-1 justify-between p-3.5">
          <View className="flex-row items-start justify-between">
            <View className="flex-row gap-1.5">
              {styles.map((style) => (
                <View key={style.id} className="bg-background/70 rounded-full px-2.5 py-1">
                  <Text className="font-body-medium text-foreground text-[11px]">
                    {style.emoji}
                    {style.name}
                  </Text>
                </View>
              ))}
            </View>
            <GuardedPressable
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
              onPress={() =>
                requireAuth(() => {
                  toggleEvent(event.id);
                  trackEvent('favorite_toggled', { isFavorite: !isFavorite });
                })
              }
              hitSlop={8}
              className="bg-background/40 h-9 w-9 items-center justify-center rounded-full active:opacity-80"
            >
              <Icon
                name="heart"
                variant={isFavorite ? 'solid' : 'regular'}
                color={isFavorite ? colors.primary : colors.foreground}
                size={18}
              />
            </GuardedPressable>
          </View>

          <View className="gap-1.5">
            {badge ? <GradientBadge label={badge} /> : null}
            <Text
              className="font-heading text-foreground text-[22px]"
              style={{ letterSpacing: headingLetterSpacing(22) }}
            >
              {event.name}
            </Text>
            <Text className="font-body text-muted-foreground text-[13px]">
              {event.attraction} · {establishment.name}
            </Text>
          </View>
        </View>
      </View>

      {distanceText || (instagramHandle && instagramUrl) ? (
        <View className="bg-surface/50 border-border flex-row items-center justify-between border-b px-4 py-1.5">
          {distanceText ? (
            <View className="flex-row items-center gap-1.5">
              <Icon name="location-dot" color={colors.primary} size={12} />
              <Text className="font-body text-muted-foreground text-[12px]">{distanceText}</Text>
            </View>
          ) : (
            <View />
          )}
          {instagramHandle && instagramUrl ? (
            <GuardedPressable
              accessibilityRole="link"
              accessibilityLabel={`Abrir ${instagramHandle} no Instagram`}
              onPress={() => Linking.openURL(instagramUrl)}
              className="flex-row items-center gap-1.5"
            >
              <Icon name="instagram" color={colors.primary} size={12} />
              <Text className="font-body-medium text-primary text-[12px]">{instagramHandle}</Text>
            </GuardedPressable>
          ) : null}
        </View>
      ) : null}

      <View className="bg-popover flex-row justify-between px-4 py-3">
        <View className="gap-2">
          <FooterItem
            icon={<Icon name="calendar" variant="regular" color={colors.primary} size={14} />}
          >
            <Text className="font-body text-foreground text-[13px]">
              {formatRelativeDay(event.starts_at)}
            </Text>
          </FooterItem>
          <FooterItem icon={<Icon name="location-dot" color={colors.primary} size={14} />}>
            <Text className="font-body text-foreground text-[13px]">
              {establishment.neighborhood}
            </Text>
          </FooterItem>
        </View>
        <View className="items-end gap-2">
          <FooterItem
            icon={<Icon name="clock" variant="regular" color={colors.primary} size={14} />}
          >
            <Text className="font-body text-foreground text-[13px]">
              {formatTimeRange(event.starts_at, event.ends_at)}
            </Text>
          </FooterItem>
          <FooterItem icon={<Icon name="ticket" color={colors.primary} size={14} />}>
            <Text className="font-body-semibold text-primary text-[13px]">{price}</Text>
          </FooterItem>
        </View>
      </View>

      {/* Diferenciais são do bar, não do evento: o card já recebe o
          establishment, então não custa consulta extra. O semáforo ancora no
          extremo direito desta linha. */}
      {establishment.attributes.length > 0 || statusLight ? (
        <View className="bg-popover border-border flex-row items-center justify-between gap-2 border-t px-4 pt-2.5 pb-3">
          <View className="flex-1">
            <AttributeChips attributes={establishment.attributes} max={MAX_CARD_ATTRIBUTES} />
          </View>
          <StatusLightBadge light={statusLight} />
        </View>
      ) : null}
    </GuardedPressable>
  );
});
