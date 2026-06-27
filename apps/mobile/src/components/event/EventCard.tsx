import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { GradientBadge } from '@/components/ui/GradientBadge';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import type { Establishment, Event, MusicStyle } from '@/data/schemas';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { gradientCardOverlay } from '@/theme/gradients';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, Text, View } from '@/tw';
import { formatRelativeDay, formatTimeRange } from '@/utils/dates';
import { formatPrice } from '@/utils/format';

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
}

/**
 * Card de evento do feed, fiel ao protótipo. Memoizado: nas listas, só
 * re-renderiza quando event/establishment/styles mudam de referência.
 */
export const EventCard = memo(function EventCard({ event, establishment, styles }: EventCardProps) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const isFavorite = useFavoritesStore((state) => state.eventIds.includes(event.id));
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  const badge = event.courtesy ? 'Cortesia' : event.promo ? 'Promoção' : null;
  const price = formatPrice(event.cover_charge);

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
              onPress={() => requireAuth(() => toggleEvent(event.id))}
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

      <View className="bg-popover flex-row justify-between px-4 py-3">
        <View className="gap-2">
          <FooterItem icon={<Icon name="calendar" variant="regular" color={colors.primary} size={14} />}>
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
          <FooterItem icon={<Icon name="clock" variant="regular" color={colors.primary} size={14} />}>
            <Text className="font-body text-foreground text-[13px]">
              {formatTimeRange(event.starts_at, event.ends_at)}
            </Text>
          </FooterItem>
          <FooterItem icon={<Icon name="ticket" color={colors.primary} size={14} />}>
            <Text className="font-body-semibold text-primary text-[13px]">{price}</Text>
          </FooterItem>
        </View>
      </View>
    </GuardedPressable>
  );
});
