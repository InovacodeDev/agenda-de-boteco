import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { EventCard } from '@/components/event/EventCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { indexById, musicStylesForEvent } from '@/data/lookup';
import type { Establishment, Event } from '@/data/schemas';
import { useEstablishmentsQuery, useEventsQuery, useMusicStylesQuery } from '@/hooks/queries';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { View } from '@/tw';

// Espaçamentos do layout original: eventos gap-4, bares gap-3
const EventSeparator = () => <View className="h-4" />;
const EstablishmentSeparator = () => <View className="h-3" />;

const renderFavoriteEstablishment = ({ item }: { item: Establishment }) => (
  <EstablishmentCard establishment={item} />
);

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);

  const { data: events } = useEventsQuery();
  const { data: establishments } = useEstablishmentsQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  const establishmentsById = useMemo(
    () => indexById(establishments ?? []),
    [establishments],
  );
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  // Descarta eventos cujo estabelecimento ainda não chegou (queries têm
  // latências distintas) ou foi removido no servidor — EventCard exige
  // `establishment` e quebraria com uma referência pendente.
  const favoriteEvents = useMemo(
    () =>
      (events ?? []).filter(
        (event) => eventIds.includes(event.id) && establishmentsById[event.establishment_id],
      ),
    [events, eventIds, establishmentsById],
  );
  const favoriteEstablishments = useMemo(
    () =>
      (establishments ?? []).filter((establishment) =>
        establishmentIds.includes(establishment.id),
      ),
    [establishments, establishmentIds],
  );

  const renderFavoriteEvent = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        establishment={establishmentsById[item.establishment_id]}
        styles={musicStylesForEvent(item, stylesById)}
      />
    ),
    [establishmentsById, stylesById],
  );

  const showingEvents = activeTab === 0;
  const isEmpty = showingEvents ? favoriteEvents.length === 0 : favoriteEstablishments.length === 0;

  return (
    <Screen>
      <ScreenHeader title="Favoritos" showLogo />
      <View className="px-4 pb-4">
        <SegmentedTabs
          tabs={[`Eventos (${favoriteEvents.length})`, `Bares (${favoriteEstablishments.length})`]}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />
      </View>
      {isEmpty ? (
        <View className="px-4">
          <EmptyState
            icon={<Icon name="heart" variant="regular" color={colors.mutedForeground} size={32} />}
            message={
              showingEvents
                ? 'Você ainda não favoritou nenhum evento.'
                : 'Você ainda não favoritou nenhum bar.'
            }
            actionLabel="Ver feed"
            onAction={() => router.push('/')}
          />
        </View>
      ) : showingEvents ? (
        <FlashList
          data={favoriteEvents}
          keyExtractor={(event) => event.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={EventSeparator}
          renderItem={renderFavoriteEvent}
        />
      ) : (
        <FlashList
          data={favoriteEstablishments}
          keyExtractor={(establishment) => establishment.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={EstablishmentSeparator}
          renderItem={renderFavoriteEstablishment}
        />
      )}
    </Screen>
  );
}
