import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Navigation,
  Share2,
  Store,
  Ticket,
} from 'lucide-react-native';
import { Linking, Share, StyleSheet } from 'react-native';

import { Screen } from '@/src/components/layout/Screen';
import { Button } from '@/src/components/ui/Button';
import { CircleIconButton } from '@/src/components/ui/CircleIconButton';
import { GradientBadge } from '@/src/components/ui/GradientBadge';
import { InfoCard } from '@/src/components/ui/InfoCard';
import { SectionLabel } from '@/src/components/ui/SectionLabel';
import { ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from '@/src/data';
import { useRequireAuth } from '@/src/hooks/useRequireAuth';
import { useFavoritesStore } from '@/src/store/useFavoritesStore';
import { colors } from '@/src/theme/colors';
import { headingLetterSpacing } from '@/src/theme/typography';
import { Image, ScrollView, Text, View } from '@/src/tw';
import { formatRelativeDay, formatTime } from '@/src/utils/dates';
import { formatPrice } from '@/src/utils/format';
import { buildDirectionsUrl } from '@/src/utils/links';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const event = EVENTS.find((item) => item.id === id);
  const establishment = event
    ? ESTABLISHMENTS.find((item) => item.id === event.establishment_id)
    : undefined;

  const isFavorite = useFavoritesStore((state) =>
    event ? state.eventIds.includes(event.id) : false,
  );
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  if (!event || !establishment) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-body text-[14px] text-muted-foreground">
          Evento não encontrado.
        </Text>
      </View>
    );
  }

  const styles = event.music_style_ids
    .map((styleId) => MUSIC_STYLES.find((style) => style.id === styleId))
    .filter((style) => style !== undefined);

  const badge = event.courtesy
    ? { label: 'Cortesia', text: event.courtesy }
    : event.promo
      ? { label: 'Promoção', text: event.promo }
      : null;

  const share = () => {
    Share.share({
      message: `${event.name} — ${event.attraction} no ${establishment.name}. Bora?`,
    });
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View className="h-65">
          <Image
            source={{ uri: event.banner_url }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={event.name}
          />
          <View
            className="flex-1 justify-between p-4"
            style={{ paddingTop: 8 }}
          >
            <View className="flex-row items-center justify-between">
              <CircleIconButton
                accessibilityLabel="Voltar"
                icon={<ArrowLeft color={colors.foreground} size={20} />}
                onPress={() => router.back()}
              />
              <View className="flex-row gap-2">
                <CircleIconButton
                  accessibilityLabel="Compartilhar evento"
                  icon={<Share2 color={colors.foreground} size={18} />}
                  onPress={share}
                />
                <CircleIconButton
                  accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
                  icon={
                    <Heart
                      color={isFavorite ? colors.primary : colors.foreground}
                      fill={isFavorite ? colors.primary : 'transparent'}
                      size={18}
                    />
                  }
                  onPress={() => requireAuth(() => toggleEvent(event.id))}
                />
              </View>
            </View>
            <View className="flex-row gap-1.5">
              {styles.map((style) => (
                <View key={style.id} className="rounded-full bg-background/70 px-2.5 py-1">
                  <Text className="font-body-medium text-[11px] text-foreground">
                    {style.emoji}
                    {style.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="gap-4 p-4">
          <View className="gap-1">
            <Text
              className="font-heading text-[24px] text-foreground"
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {event.name}
            </Text>
            <Text className="font-body text-[15px] text-muted-foreground">
              {event.attraction}
            </Text>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <InfoCard
                label="Data"
                value={formatRelativeDay(event.starts_at)}
                icon={<Calendar color={colors.mutedForeground} size={13} />}
              />
              <InfoCard
                label="Horário"
                value={formatTime(event.starts_at)}
                icon={<Clock color={colors.mutedForeground} size={13} />}
              />
            </View>
            <View className="flex-row gap-3">
              <InfoCard
                label="Local"
                value={`${establishment.name} · ${establishment.neighborhood}`}
                icon={<MapPin color={colors.mutedForeground} size={13} />}
              />
              <InfoCard
                label="Entrada"
                value={formatPrice(event.cover_charge)}
                icon={<Ticket color={colors.mutedForeground} size={13} />}
                highlight
              />
            </View>
          </View>

          {badge ? (
            <View className="gap-1.5 rounded-2xl bg-card p-4">
              <GradientBadge label={badge.label} />
              <Text className="font-body text-[14px] text-foreground">{badge.text}</Text>
            </View>
          ) : null}

          <View className="gap-2">
            <SectionLabel>Sobre o evento</SectionLabel>
            <Text className="font-body text-[14px] leading-5 text-foreground">
              {event.description}
            </Text>
          </View>

        </View>
      </ScrollView>

      <View
        className="gap-3 bg-background/95 px-4 pt-2 pb-2"
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
      >
        <Button
          label="Como chegar"
          variant="outline"
          className="flex-1 border-foreground/50 border[0.5px]"
          style={{ backgroundColor: colors.background }}
          icon={<Navigation color={colors.foreground} size={16} />}
          onPress={() =>
            Linking.openURL(
              buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }),
            )
          }
        />
        <Button
          label="Ver estabelecimento"
          className="flex-1"
          icon={<Store color={colors.primaryForeground} size={16} />}
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.push(`/establishment/${establishment.id}`)}
        />
      </View>
    </Screen>
  );
}
