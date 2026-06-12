import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { EventCard } from '@/components/event/EventCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { ESTABLISHMENTS, EVENTS } from '@/data';
import { ESTABLISHMENTS_BY_ID, musicStylesForEvent } from '@/data/lookup';
import type { Establishment, Event } from '@/data/schemas';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { colors } from '@/theme/colors';
import { View } from '@/tw';

// Espaçamentos do layout original: eventos gap-4, bares gap-3
const EventSeparator = () => <View className="h-4" />;
const EstablishmentSeparator = () => <View className="h-3" />;

const renderFavoriteEvent = ({ item }: { item: Event }) => (
  <EventCard
    event={item}
    establishment={ESTABLISHMENTS_BY_ID[item.establishment_id]}
    styles={musicStylesForEvent(item)}
  />
);

const renderFavoriteEstablishment = ({ item }: { item: Establishment }) => (
  <EstablishmentCard establishment={item} />
);

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);

  const favoriteEvents = useMemo(
    () => EVENTS.filter((event) => eventIds.includes(event.id)),
    [eventIds],
  );
  const favoriteEstablishments = useMemo(
    () => ESTABLISHMENTS.filter((establishment) => establishmentIds.includes(establishment.id)),
    [establishmentIds],
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
            icon={<Heart color={colors.mutedForeground} size={32} />}
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
