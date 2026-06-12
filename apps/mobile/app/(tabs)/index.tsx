import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useState } from 'react';

import { EventCard } from '@/components/event/EventCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { QuickFilterChips } from '@/components/feed/QuickFilterChips';
import { SearchBar } from '@/components/feed/SearchBar';
import { StyleCard } from '@/components/feed/StyleCard';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { EVENTS, MUSIC_STYLES } from '@/data';
import { cityByIdOrDefault, ESTABLISHMENTS_BY_ID, musicStylesForEvent } from '@/data/lookup';
import type { Event } from '@/data/schemas';
import { useFiltersStore } from '@/store/useFiltersStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { headingLetterSpacing } from '@/theme/typography';
import { ScrollView, Text, View } from '@/tw';
import { applyEventFilters } from '@/utils/filters';

const ItemSeparator = () => <View className="h-4" />;

// Estável fora do componente: junto com EventCard memoizado e os caches de
// lookup, evita re-render dos cards visíveis a cada tecla da busca.
const renderEvent = ({ item }: { item: Event }) => (
  <EventCard
    event={item}
    establishment={ESTABLISHMENTS_BY_ID[item.establishment_id]}
    styles={musicStylesForEvent(item)}
  />
);

export default function FeedScreen() {
  const cityId = usePreferencesStore((state) => state.cityId);
  const filters = useFiltersStore((state) => state.filters);
  const setQuery = useFiltersStore((state) => state.setQuery);
  const toggleStyle = useFiltersStore((state) => state.toggleStyle);

  // "agora" estável por render da lista, atualizado a cada minuto
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const city = cityByIdOrDefault(cityId);

  const events = useMemo(
    () =>
      applyEventFilters(EVENTS, filters, {
        now,
        cityId: city.id,
        establishmentsById: ESTABLISHMENTS_BY_ID,
      }),
    [filters, now, city.id],
  );

  return (
    <Screen>
      <ScreenHeader>
        <FeedHeader city={city} />
      </ScreenHeader>
      <FlashList
        data={events}
        keyExtractor={(event) => event.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={
          <View className="gap-4 pt-2 pb-4">
            <View className="gap-1">
              <Text
                className="font-heading text-foreground text-[28px]"
                style={{ letterSpacing: headingLetterSpacing(28) }}
              >
                O que rola em <Text className="text-primary">{city.name}</Text> hoje?
              </Text>
              <Text className="font-body text-muted-foreground text-[14px]">
                Cards quentinhos da agenda da noite.
              </Text>
            </View>
            <SearchBar value={filters.query} onChangeText={setQuery} />
            <QuickFilterChips />
            <View className="gap-2.5">
              <SectionLabel>Estilos em alta</SectionLabel>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="flex-row gap-2"
              >
                {MUSIC_STYLES.map((style) => (
                  <StyleCard
                    key={style.id}
                    style={style}
                    selected={filters.styleIds.includes(style.id)}
                    onPress={() => toggleStyle(style.id)}
                  />
                ))}
              </ScrollView>
            </View>
            <SectionLabel>
              {`${events.length} ${events.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
            </SectionLabel>
          </View>
        }
        renderItem={renderEvent}
      />
    </Screen>
  );
}
