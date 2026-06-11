import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Calendar, Clock, Heart, MapPin, Ticket } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { Establishment, Event, MusicStyle } from '../../data/schemas';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { colors } from '../../theme/colors';
import { gradientCardOverlay } from '../../theme/gradients';
import { headingLetterSpacing } from '../../theme/typography';
import { Image, Pressable, Text, View } from '../../tw';
import { formatRelativeDay, formatTime } from '../../utils/dates';
import { formatPrice } from '../../utils/format';
import { GradientBadge } from '../ui/GradientBadge';

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

/** Card de evento do feed, fiel ao protótipo */
export function EventCard({ event, establishment, styles }: EventCardProps) {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const isFavorite = useFavoritesStore((state) => state.eventIds.includes(event.id));
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  const badge = event.courtesy ? 'Cortesia' : event.promo ? 'Promoção' : null;
  const price = formatPrice(event.cover_charge);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Evento ${event.name} no ${establishment.name}`}
      onPress={() => router.push(`/event/${event.id}`)}
      className="overflow-hidden rounded-2xl bg-card active:opacity-90"
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
                <View
                  key={style.id}
                  className="rounded-full bg-background/70 px-2.5 py-1"
                >
                  <Text className="font-body-medium text-[11px] text-foreground">
                    {style.emoji}
                    {style.name}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
              onPress={() => requireAuth(() => toggleEvent(event.id))}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-background/40 active:opacity-80"
            >
              <Heart
                color={isFavorite ? colors.primary : colors.foreground}
                fill={isFavorite ? colors.primary : 'transparent'}
                size={18}
              />
            </Pressable>
          </View>

          <View className="gap-1.5">
            {badge ? <GradientBadge label={badge} /> : null}
            <Text
              className="font-heading text-[22px] text-foreground"
              style={{ letterSpacing: headingLetterSpacing(22) }}
            >
              {event.name}
            </Text>
            <Text className="font-body text-[13px] text-muted-foreground">
              {event.attraction} · {establishment.name}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between bg-popover px-4 py-3">
        <View className="gap-2">
          <FooterItem icon={<Calendar color={colors.primary} size={14} />}>
            <Text className="font-body text-[13px] text-foreground">
              {formatRelativeDay(event.starts_at)}
            </Text>
          </FooterItem>
          <FooterItem icon={<MapPin color={colors.primary} size={14} />}>
            <Text className="font-body text-[13px] text-foreground">
              {establishment.neighborhood}
            </Text>
          </FooterItem>
        </View>
        <View className="items-end gap-2">
          <FooterItem icon={<Clock color={colors.primary} size={14} />}>
            <Text className="font-body text-[13px] text-foreground">
              {formatTime(event.starts_at)}
            </Text>
          </FooterItem>
          <FooterItem icon={<Ticket color={colors.primary} size={14} />}>
            <Text className="font-body-semibold text-[13px] text-primary">{price}</Text>
          </FooterItem>
        </View>
      </View>
    </Pressable>
  );
}
