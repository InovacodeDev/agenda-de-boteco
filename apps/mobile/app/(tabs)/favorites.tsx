import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useState } from 'react';

import { EstablishmentCard } from '../../src/components/establishment/EstablishmentCard';
import { EventCard } from '../../src/components/event/EventCard';
import { Screen } from '../../src/components/layout/Screen';
import { ScreenHeader } from '../../src/components/layout/ScreenHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SegmentedTabs } from '../../src/components/ui/SegmentedTabs';
import { ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from '../../src/data';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import { colors } from '../../src/theme/colors';
import { ScrollView, View } from '../../src/tw';

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);

  const favoriteEvents = EVENTS.filter((event) => eventIds.includes(event.id));
  const favoriteEstablishments = ESTABLISHMENTS.filter((establishment) =>
    establishmentIds.includes(establishment.id),
  );

  const stylesFor = (styleIds: string[]) =>
    styleIds
      .map((styleId) => MUSIC_STYLES.find((style) => style.id === styleId))
      .filter((style) => style !== undefined);

  return (
    <Screen>
      <ScreenHeader title="Favoritos" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-4 p-4">
        <SegmentedTabs
          tabs={[`Eventos (${favoriteEvents.length})`, `Bares (${favoriteEstablishments.length})`]}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 0 ? (
          favoriteEvents.length === 0 ? (
            <EmptyState
              icon={<Heart color={colors.mutedForeground} size={32} />}
              message="Você ainda não favoritou nenhum evento."
              actionLabel="Ver feed"
              onAction={() => router.push('/')}
            />
          ) : (
            <View className="gap-4">
              {favoriteEvents.map((event) => {
                const establishment = ESTABLISHMENTS.find(
                  (item) => item.id === event.establishment_id,
                );
                if (!establishment) return null;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    establishment={establishment}
                    styles={stylesFor(event.music_style_ids)}
                  />
                );
              })}
            </View>
          )
        ) : favoriteEstablishments.length === 0 ? (
          <EmptyState
            icon={<Heart color={colors.mutedForeground} size={32} />}
            message="Você ainda não favoritou nenhum bar."
            actionLabel="Ver feed"
            onAction={() => router.push('/')}
          />
        ) : (
          <View className="gap-3">
            {favoriteEstablishments.map((establishment) => (
              <EstablishmentCard key={establishment.id} establishment={establishment} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
