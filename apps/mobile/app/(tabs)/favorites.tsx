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
import { useEstablishmentsByIds, useEventsByIds, useMusicStylesQuery } from '@/hooks/queries';
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

  // Busca direta por id: os favoritos podem estar fora das páginas do feed. O
  // resultado pode ser o da seleção anterior (placeholder), por isso os filtros
  // abaixo reconferem os ids atuais da store.
  const eventsQuery = useEventsByIds(eventIds);
  const favoriteEstablishmentsQuery = useEstablishmentsByIds(establishmentIds);
  const events = eventsQuery.data;
  const favoriteEstablishmentsData = favoriteEstablishmentsQuery.data;
  const eventEstablishmentIds = useMemo(
    () => (events ?? []).map((event) => event.establishment_id),
    [events],
  );
  const eventEstablishmentsQuery = useEstablishmentsByIds(eventEstablishmentIds);
  const eventEstablishments = eventEstablishmentsQuery.data;
  const { data: musicStyles } = useMusicStylesQuery();

  const establishmentsById = useMemo(
    () => indexById([...(favoriteEstablishmentsData ?? []), ...(eventEstablishments ?? [])]),
    [favoriteEstablishmentsData, eventEstablishments],
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
      (favoriteEstablishmentsData ?? []).filter((establishment) =>
        establishmentIds.includes(establishment.id),
      ),
    [favoriteEstablishmentsData, establishmentIds],
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

  const isLoading =
    eventsQuery.isLoading ||
    favoriteEstablishmentsQuery.isLoading ||
    eventEstablishmentsQuery.isLoading;
  const showingEvents = activeTab === 0;
  const isEmpty = showingEvents ? favoriteEvents.length === 0 : favoriteEstablishments.length === 0;

  return (
    <Screen header={<ScreenHeader title="Favoritos" showLogo />}>
      <View className="px-4 pb-4">
        <SegmentedTabs
          tabs={[`Eventos (${favoriteEvents.length})`, `Bares (${favoriteEstablishments.length})`]}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />
      </View>
      {isLoading && isEmpty ? null : isEmpty ? (
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
