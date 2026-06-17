import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Share, StyleSheet } from 'react-native';

import { AgendaItem } from '@/components/establishment/AgendaItem';
import { MenuItemRow } from '@/components/establishment/MenuItemRow';
import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Icon } from '@/components/ui/Icon';
import { RatingStars } from '@/components/ui/RatingStars';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { FEATURES } from '@/config/features';
import { indexById, musicStylesForEvent } from '@/data/lookup';
import {
  useEstablishmentQuery,
  useEventsByEstablishmentQuery,
  useMusicStylesQuery,
} from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, ScrollView, Text, View } from '@/tw';
import { buildDirectionsUrl, buildEstablishmentShareUrl, buildWhatsAppUrl } from '@/utils/links';

const TABS = ['Sobre', 'Agenda', 'Cardápio', 'Reviews'];

interface AboutCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function AboutCard({ label, value, icon }: AboutCardProps) {
  return (
    <View className="bg-card gap-1 rounded-2xl px-4 py-3.5">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="font-body text-muted-foreground text-[12px]">{label}</Text>
      </View>
      <Text className="font-body-semibold text-foreground text-[14px]">{value}</Text>
    </View>
  );
}

function EstablishmentDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requireAuth = useRequireAuth();
  const [activeTab, setActiveTab] = useState(0);

  const establishmentQuery = useEstablishmentQuery(id ?? '');
  const establishment = establishmentQuery.data;
  // O service/core já ordena a agenda por starts_at asc.
  const { data: agendaData } = useEventsByEstablishmentQuery(id ?? '');
  const agenda = agendaData ?? [];
  const { data: musicStyles } = useMusicStylesQuery();
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  const isFavorite = useFavoritesStore((state) =>
    establishment ? state.establishmentIds.includes(establishment.id) : false,
  );
  const toggleEstablishment = useFavoritesStore((state) => state.toggleEstablishment);

  if (establishmentQuery.isLoading) {
    return (
      <Screen header={<ScreenHeader showBack />}>
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-muted-foreground text-[14px]">Carregando…</Text>
        </View>
      </Screen>
    );
  }

  if (!establishment) {
    return (
      <Screen header={<ScreenHeader showBack />}>
        <View className="flex-1 items-center justify-center">
          <Text className="font-body text-muted-foreground text-[14px]">
            Estabelecimento não encontrado.
          </Text>
        </View>
      </Screen>
    );
  }

  const share = () => {
    const url = buildEstablishmentShareUrl(
      { slugOrId: establishment.id },
      process.env.EXPO_PUBLIC_SHARE_BASE_URL,
    );
    const text = `${establishment.name} no Agenda de Boteco`;
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
              accessibilityLabel="Compartilhar estabelecimento"
              icon={<Icon name="share-nodes" color={colors.foreground} size={18} />}
              onPress={share}
            />
            <CircleIconButton
              accessibilityLabel={
                isFavorite ? 'Remover dos favoritos' : 'Favoritar estabelecimento'
              }
              icon={
                <Icon
                  name="heart"
                  variant={isFavorite ? 'solid' : 'regular'}
                  color={isFavorite ? colors.primary : colors.foreground}
                  size={18}
                />
              }
              onPress={() => requireAuth(() => toggleEstablishment(establishment.id))}
            />
          </>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View className="h-65">
          <Image
            source={{ uri: establishment.cover_url }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={establishment.name}
          />
        </View>

        <View className="gap-4 p-4">
          <View className="-mt-14 flex-row items-end gap-3">
            <Image
              source={{ uri: establishment.logo_url }}
              contentFit="cover"
              className="border-background h-16 w-16 rounded-2xl border-2"
              accessibilityLabel={`Logo ${establishment.name}`}
            />
            <View className="flex-1 gap-0.5 pb-1">
              <Text className="font-body text-muted-foreground text-[12px]">
                {establishment.ambiance} · {establishment.price_range}
              </Text>
            </View>
          </View>

          <View className="gap-1">
            <Text
              className="font-heading text-foreground text-[24px]"
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {establishment.name}
            </Text>
            <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
          </View>

          <Text className="font-body text-foreground text-[14px] leading-5">
            {establishment.description}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {establishment.highlights.map((highlight) => (
              <View key={highlight} className="bg-surface-elevated rounded-full px-3 py-1.5">
                <Text className="font-body text-foreground text-[12px]">{highlight}</Text>
              </View>
            ))}
          </View>

          <SegmentedTabs tabs={TABS} activeIndex={activeTab} onChange={setActiveTab} />

          {activeTab === 0 ? (
            <View className="gap-3">
              <AboutCard
                label="Endereço"
                value={`${establishment.address} · ${establishment.neighborhood}`}
                icon={<Icon name="location-dot" color={colors.primary} size={13} />}
              />
              <AboutCard
                label="Horário"
                value={establishment.opening_hours}
                icon={
                  <Icon name="clock" variant="regular" color={colors.mutedForeground} size={13} />
                }
              />
              {establishment.instagram ? (
                <AboutCard
                  label="Instagram"
                  value={establishment.instagram}
                  icon={<Icon name="at" color={colors.primary} size={13} />}
                />
              ) : null}
            </View>
          ) : null}

          {activeTab === 1 ? (
            <View className="gap-3">
              {agenda.length === 0 ? (
                <Text className="font-body text-muted-foreground text-[14px]">
                  Nenhum evento agendado.
                </Text>
              ) : (
                agenda.map((event) => (
                  <AgendaItem
                    key={event.id}
                    event={event}
                    styles={musicStylesForEvent(event, stylesById)}
                  />
                ))
              )}
            </View>
          ) : null}

          {activeTab === 2 ? (
            <View className="gap-3">
              {establishment.menu_items.length === 0 ? (
                <Text className="font-body text-muted-foreground text-[14px]">
                  Cardápio não informado.
                </Text>
              ) : (
                establishment.menu_items.map((item) => <MenuItemRow key={item.name} item={item} />)
              )}
            </View>
          ) : null}

          {activeTab === 3 ? (
            <View className="bg-card items-center gap-2 rounded-2xl p-6">
              <RatingStars avg={establishment.rating_avg} count={establishment.rating_count} />
              <Text className="font-body text-muted-foreground text-center text-[13px]">
                Avaliações de {establishment.rating_count} pessoas que já curtiram a noite por aqui.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="bg-background/95 gap-3 px-4 pt-2 pb-2"
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
      >
        <Button
          label="WhatsApp"
          className="flex-1"
          icon={
            <Icon name="comment" variant="regular" color={colors.primaryForeground} size={16} />
          }
          style={{ backgroundColor: colors.primary }}
          onPress={() => Linking.openURL(buildWhatsAppUrl(establishment.whatsapp))}
        />
        <Button
          variant="outline"
          className="border-foreground/50 border-[0.5px]"
          style={{ backgroundColor: colors.background }}
          icon={<Icon name="location-arrow" color={colors.foreground} size={16} />}
          onPress={() =>
            Linking.openURL(buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }))
          }
        />
      </View>
    </Screen>
  );
}

export default function EstablishmentDetailScreen() {
  if (!FEATURES.establishmentDetail) {
    return (
      <UnderConstruction
        version="v2"
        icon={<Icon name="store" color={colors.primary} size={36} />}
        title="Os botecos estão se arrumando"
        description='Em breve você explora cada bar por dentro: cardápio, fotos, agenda completa e aquele papo de "bora pra cá hoje?". Tá vindo na v2 — aguenta firme que a rodada tá chegando.'
      />
    );
  }
  return <EstablishmentDetailContent />;
}
