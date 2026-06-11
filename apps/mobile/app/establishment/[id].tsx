import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  AtSign,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Navigation,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgendaItem } from '../../src/components/establishment/AgendaItem';
import { MenuItemRow } from '../../src/components/establishment/MenuItemRow';
import { Button } from '../../src/components/ui/Button';
import { CircleIconButton } from '../../src/components/ui/CircleIconButton';
import { RatingStars } from '../../src/components/ui/RatingStars';
import { SegmentedTabs } from '../../src/components/ui/SegmentedTabs';
import { ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from '../../src/data';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import { colors } from '../../src/theme/colors';
import { headingLetterSpacing } from '../../src/theme/typography';
import { Image, Pressable, ScrollView, Text, View } from '../../src/tw';
import { buildDirectionsUrl, buildWhatsAppUrl } from '../../src/utils/links';

const TABS = ['Sobre', 'Agenda', 'Cardápio', 'Reviews'];

interface AboutCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function AboutCard({ label, value, icon }: AboutCardProps) {
  return (
    <View className="gap-1 rounded-2xl bg-card px-4 py-3.5">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="font-body text-[12px] text-muted-foreground">{label}</Text>
      </View>
      <Text className="font-body-semibold text-[14px] text-foreground">{value}</Text>
    </View>
  );
}

export default function EstablishmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);

  const establishment = ESTABLISHMENTS.find((item) => item.id === id);
  const isFavorite = useFavoritesStore((state) =>
    establishment ? state.establishmentIds.includes(establishment.id) : false,
  );
  const toggleEstablishment = useFavoritesStore((state) => state.toggleEstablishment);

  if (!establishment) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-body text-[14px] text-muted-foreground">
          Estabelecimento não encontrado.
        </Text>
      </View>
    );
  }

  const agenda = EVENTS.filter(
    (event) => event.establishment_id === establishment.id,
  ).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const stylesFor = (styleIds: string[]) =>
    styleIds
      .map((styleId) => MUSIC_STYLES.find((style) => style.id === styleId))
      .filter((style) => style !== undefined);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      >
        <View className="h-[260px]">
          <Image
            source={{ uri: establishment.cover_url }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={establishment.name}
          />
          <View
            className="flex-row items-center justify-between p-4"
            style={{ paddingTop: insets.top + 8 }}
          >
            <CircleIconButton
              accessibilityLabel="Voltar"
              icon={<ArrowLeft color={colors.foreground} size={20} />}
              onPress={() => router.back()}
            />
            <CircleIconButton
              accessibilityLabel={
                isFavorite ? 'Remover dos favoritos' : 'Favoritar estabelecimento'
              }
              icon={
                <Heart
                  color={isFavorite ? colors.primary : colors.foreground}
                  fill={isFavorite ? colors.primary : 'transparent'}
                  size={18}
                />
              }
              onPress={() => toggleEstablishment(establishment.id)}
            />
          </View>
        </View>

        <View className="gap-4 p-4">
          <View className="-mt-14 flex-row items-end gap-3">
            <Image
              source={{ uri: establishment.logo_url }}
              contentFit="cover"
              className="h-16 w-16 rounded-2xl border-2 border-background"
              accessibilityLabel={`Logo ${establishment.name}`}
            />
            <View className="flex-1 gap-0.5 pb-1">
              <Text className="font-body text-[12px] text-muted-foreground">
                {establishment.ambiance} · {establishment.price_range}
              </Text>
            </View>
          </View>

          <View className="gap-1">
            <Text
              className="font-heading text-[24px] text-foreground"
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {establishment.name}
            </Text>
            <RatingStars
              avg={establishment.rating_avg}
              count={establishment.rating_count}
            />
          </View>

          <Text className="font-body text-[14px] leading-5 text-foreground">
            {establishment.description}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {establishment.highlights.map((highlight) => (
              <View key={highlight} className="rounded-full bg-surface-elevated px-3 py-1.5">
                <Text className="font-body text-[12px] text-foreground">{highlight}</Text>
              </View>
            ))}
          </View>

          <SegmentedTabs tabs={TABS} activeIndex={activeTab} onChange={setActiveTab} />

          {activeTab === 0 ? (
            <View className="gap-3">
              <AboutCard
                label="Endereço"
                value={`${establishment.address} · ${establishment.neighborhood}`}
                icon={<MapPin color={colors.primary} size={13} />}
              />
              <AboutCard
                label="Horário"
                value={establishment.opening_hours}
                icon={<Clock color={colors.mutedForeground} size={13} />}
              />
              {establishment.instagram ? (
                <AboutCard
                  label="Instagram"
                  value={establishment.instagram}
                  icon={<AtSign color={colors.primary} size={13} />}
                />
              ) : null}
            </View>
          ) : null}

          {activeTab === 1 ? (
            <View className="gap-3">
              {agenda.length === 0 ? (
                <Text className="font-body text-[14px] text-muted-foreground">
                  Nenhum evento agendado.
                </Text>
              ) : (
                agenda.map((event) => (
                  <AgendaItem
                    key={event.id}
                    event={event}
                    styles={stylesFor(event.music_style_ids)}
                  />
                ))
              )}
            </View>
          ) : null}

          {activeTab === 2 ? (
            <View className="gap-3">
              {establishment.menu_items.length === 0 ? (
                <Text className="font-body text-[14px] text-muted-foreground">
                  Cardápio não informado.
                </Text>
              ) : (
                establishment.menu_items.map((item) => (
                  <MenuItemRow key={item.name} item={item} />
                ))
              )}
            </View>
          ) : null}

          {activeTab === 3 ? (
            <View className="items-center gap-2 rounded-2xl bg-card p-6">
              <RatingStars
                avg={establishment.rating_avg}
                count={establishment.rating_count}
              />
              <Text className="text-center font-body text-[13px] text-muted-foreground">
                Avaliações de {establishment.rating_count} pessoas que já curtiram a noite
                por aqui.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="absolute inset-x-0 bottom-0 flex-row gap-3 bg-background/95 px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Button
          label="WhatsApp"
          className="flex-1"
          icon={<MessageCircle color={colors.primaryForeground} size={16} />}
          onPress={() => Linking.openURL(buildWhatsAppUrl(establishment.whatsapp))}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Como chegar"
          onPress={() =>
            Linking.openURL(
              buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng }),
            )
          }
          className="h-12 w-12 items-center justify-center rounded-full border border-border active:opacity-80"
        >
          <Navigation color={colors.foreground} size={18} />
        </Pressable>
      </View>
    </View>
  );
}
