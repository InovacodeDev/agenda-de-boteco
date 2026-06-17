import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Share, StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { Icon } from '@/components/ui/Icon';
import { InfoCard } from '@/components/ui/InfoCard';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { indexById, musicStylesForEvent } from '@/data/lookup';
import { useEstablishmentQuery, useEventQuery, useMusicStylesQuery } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, ScrollView, Text, View } from '@/tw';
import { formatRelativeDay, formatTime } from '@/utils/dates';
import { formatPrice } from '@/utils/format';
import { buildDirectionsUrl, buildEventShareUrl } from '@/utils/links';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const eventQuery = useEventQuery(id ?? '');
  const event = eventQuery.data;
  const establishmentQuery = useEstablishmentQuery(event?.establishment_id ?? '');
  const establishment = establishmentQuery.data;
  const { data: musicStyles } = useMusicStylesQuery();
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  const isFavorite = useFavoritesStore((state) =>
    event ? state.eventIds.includes(event.id) : false,
  );
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  // Não mostrar "não encontrado" enquanto carrega: só quando as queries
  // terminaram e o evento (ou seu estabelecimento) realmente não existe.
  const isLoading = eventQuery.isLoading || (!!event && establishmentQuery.isLoading);

  if (isLoading) {
    return (
      <Screen header={<ScreenHeader showBack />}>
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-muted-foreground text-[14px]">Carregando…</Text>
        </View>
      </Screen>
    );
  }

  if (eventQuery.isError && !event) {
    return (
      <Screen header={<ScreenHeader showBack />}>
        <View className="flex-1 items-center justify-center px-6">
          <EmptyState
            icon={<Icon name="circle-info" color={colors.mutedForeground} size={28} />}
            message="Você está sem internet no momento. Tente novamente quando reconectar."
            actionLabel="Tentar novamente"
            onAction={() => {
              eventQuery.refetch();
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!event || !establishment) {
    return (
      <Screen header={<ScreenHeader showBack />}>
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-muted-foreground text-[14px]">
            Evento não encontrado.
          </Text>
        </View>
      </Screen>
    );
  }

  const styles = musicStylesForEvent(event, stylesById);

  const badge = event.courtesy
    ? { label: 'Cortesia', text: event.courtesy }
    : event.promo
      ? { label: 'Promoção', text: event.promo }
      : null;

  const share = () => {
    const url = buildEventShareUrl({ slugOrId: event.id }, process.env.EXPO_PUBLIC_SHARE_BASE_URL);
    const text = `${event.name} — ${event.attraction} no ${establishment.name}. Bora?`;
    // No Android o campo `url` é ignorado, por isso a URL vai também no message.
    Share.share({ message: `${text}\n${url}`, url });
  };

  return (
    <Screen noTopInset>
      {/* Header overlay dentro do conteúdo limitado: sobrepõe o banner alinhado
          à coluna central de 768px (não full-bleed). */}
      <ScreenHeader
        overlay
        showBack
        right={
          <>
            <CircleIconButton
              accessibilityLabel="Compartilhar evento"
              icon={<Icon name="share-nodes" color={colors.foreground} size={18} />}
              onPress={share}
            />
            <CircleIconButton
              accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
              icon={
                <Icon
                  name="heart"
                  variant={isFavorite ? 'solid' : 'regular'}
                  color={isFavorite ? colors.primary : colors.foreground}
                  size={18}
                />
              }
              onPress={() => requireAuth(() => toggleEvent(event.id))}
            />
          </>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View className="h-65">
          <Image
            source={{ uri: event.banner_url }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={event.name}
          />
          <View className="flex-1 justify-end p-4">
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
          </View>
        </View>

        <View className="gap-4 p-4">
          <View className="gap-1">
            <Text
              className="font-heading text-foreground text-[24px]"
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {event.name}
            </Text>
            <Text className="font-body text-muted-foreground text-[15px]">{event.attraction}</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <InfoCard
                label="Data"
                value={formatRelativeDay(event.starts_at)}
                icon={
                  <Icon
                    name="calendar"
                    variant="regular"
                    color={colors.mutedForeground}
                    size={13}
                  />
                }
              />
              <InfoCard
                label="Horário"
                value={formatTime(event.starts_at)}
                icon={
                  <Icon name="clock" variant="regular" color={colors.mutedForeground} size={13} />
                }
              />
            </View>
            <View className="flex-row gap-3">
              <InfoCard
                label="Local"
                value={`${establishment.name} · ${establishment.neighborhood}`}
                icon={<Icon name="location-dot" color={colors.mutedForeground} size={13} />}
              />
              <InfoCard
                label="Entrada"
                value={formatPrice(event.cover_charge)}
                icon={<Icon name="ticket" color={colors.mutedForeground} size={13} />}
                highlight
              />
            </View>
          </View>

          {badge ? (
            <View className="bg-card gap-1.5 rounded-2xl p-4">
              <GradientBadge label={badge.label} />
              <Text className="font-body text-foreground text-[14px]">{badge.text}</Text>
            </View>
          ) : null}

          <View className="gap-2">
            <SectionLabel>Sobre o evento</SectionLabel>
            <Text className="font-body text-foreground text-[14px] leading-5">
              {event.description}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        className="bg-background/95 gap-3 px-4 pt-2 pb-2"
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
      >
        <Button
          label="Como chegar"
          variant="outline"
          className="border-foreground/50 flex-1 border-[0.5px]"
          style={{ backgroundColor: colors.background }}
          icon={<Icon name="location-arrow" color={colors.foreground} size={16} />}
          onPress={() =>
            Linking.openURL(buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }))
          }
        />
        <Button
          label="Ver estabelecimento"
          className="flex-1"
          icon={<Icon name="store" color={colors.primaryForeground} size={16} />}
          style={{ backgroundColor: colors.primary }}
          onPress={() => router.push(`/establishment/${establishment.id}`)}
        />
      </View>
    </Screen>
  );
}
