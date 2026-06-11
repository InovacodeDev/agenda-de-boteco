import { FlashList } from '@shopify/flash-list';
import { useEffect, useMemo, useState } from 'react';

import { EventCard } from '../../src/components/event/EventCard';
import { FeedHeader } from '../../src/components/feed/FeedHeader';
import { QuickFilterChips } from '../../src/components/feed/QuickFilterChips';
import { SearchBar } from '../../src/components/feed/SearchBar';
import { StyleCard } from '../../src/components/feed/StyleCard';
import { Screen } from '../../src/components/layout/Screen';
import { SectionLabel } from '../../src/components/ui/SectionLabel';
import { CITIES, ESTABLISHMENTS, EVENTS, MUSIC_STYLES } from '../../src/data';
import type { Establishment } from '../../src/data/schemas';
import { useFiltersStore } from '../../src/store/useFiltersStore';
import { usePreferencesStore } from '../../src/store/usePreferencesStore';
import { headingLetterSpacing } from '../../src/theme/typography';
import { ScrollView, Text, View } from '../../src/tw';
import { applyEventFilters } from '../../src/utils/filters';

const ESTABLISHMENTS_BY_ID: Record<string, Establishment> = Object.fromEntries(
  ESTABLISHMENTS.map((establishment) => [establishment.id, establishment]),
);

const STYLES_BY_ID = Object.fromEntries(
  MUSIC_STYLES.map((style) => [style.id, style]),
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

  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

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
      <FlashList
        data={events}
        keyExtractor={(event) => event.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="h-4" />}
        ListHeaderComponent={
          <View className="gap-4 pb-4 pt-2">
            <FeedHeader city={city} />
            <View className="gap-1">
              <Text
                className="font-heading text-[28px] text-foreground"
                style={{ letterSpacing: headingLetterSpacing(28) }}
              >
                O que rola em <Text className="text-primary">{city.name}</Text> hoje?
              </Text>
              <Text className="font-body text-[14px] text-muted-foreground">
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
        renderItem={({ item }) => (
          <EventCard
            event={item}
            establishment={ESTABLISHMENTS_BY_ID[item.establishment_id]}
            styles={item.music_style_ids
              .map((id) => STYLES_BY_ID[id])
              .filter((style) => style !== undefined)}
          />
        )}
      />
    </Screen>
  );
}
