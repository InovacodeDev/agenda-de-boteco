import { FlashList } from '@shopify/flash-list';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { EventCard } from '@/components/event/EventCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { QuickFilterChips } from '@/components/feed/QuickFilterChips';
import { SearchBar } from '@/components/feed/SearchBar';
import { StyleCard } from '@/components/feed/StyleCard';
import { FiltersSheet } from '@/components/filters/FiltersSheet';
import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { indexById, musicStylesForEvent } from '@/data/lookup';
import type { Event } from '@/data/schemas';
import {
  useCitiesQuery,
  useEstablishmentsQuery,
  useEventsQuery,
  useMusicStylesQuery,
} from '@/hooks/queries';
import { useActiveCity } from '@/hooks/useActiveCity';
import { useNearbyEstablishments } from '@/hooks/useNearbyEstablishments';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useFiltersStore } from '@/store/useFiltersStore';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { headingLetterSpacing } from '@/theme/typography';
import { ScrollView, Text, View } from '@/tw';
import {
  applyEstablishmentFilters,
  applyEventFilters,
  DEFAULT_ESTABLISHMENT_SORT,
  ESTABLISHMENT_SORT_LABELS,
  ESTABLISHMENT_SORT_OPTIONS,
  type EstablishmentSortBy,
  hasActiveFilters,
} from '@/utils/filters';
import { type LatLng, resolveCityFromLocation, resolveNearbyOrigin } from '@/utils/geo';

const ItemSeparator = () => <View className="h-4" />;

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Eventos, 1 = Bares
  const [barQuery, setBarQuery] = useState('');
  const [barSort, setBarSort] = useState<EstablishmentSortBy>(DEFAULT_ESTABLISHMENT_SORT);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filters = useFiltersStore((state) => state.filters);
  const setQuery = useFiltersStore((state) => state.setQuery);
  const toggleStyle = useFiltersStore((state) => state.toggleStyle);

  const hasOnboarded = usePreferencesStore((state) => state.hasOnboarded);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
  const { data: cities } = useCitiesQuery();

  const { data: events } = useEventsQuery();
  const { data: establishments } = useEstablishmentsQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  // "agora" estável por render da lista, atualizado a cada minuto
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      queueMicrotask(() => {
        setNow(new Date());
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const [liveCoords, setLiveCoords] = useState<LatLng | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    const startWatching = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        try {
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (loc) => {
              queueMicrotask(() => {
                setLiveCoords({
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                });
              });
            }
          );
        } catch {
          // ignore watch errors
        }
      }
    };
    startWatching();
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const establishmentsById = useMemo(() => indexById(establishments ?? []), [establishments]);
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  const city = useActiveCity();

  // Proximidade server-side: quando nearMe está ativo, resolve a origem (GPS ou
  // centro da cidade) e busca os establishments dentro do raio via RPC PostGIS.
  // Sem nearMe a query fica desabilitada (origin null) — zero custo.
  const { coords, status, request } = useUserLocation();

  // Se o usuário nunca fez o onboarding, pede a localização no mount e
  // configura a cidade automaticamente.
  useEffect(() => {
    if (!hasOnboarded) {
      const handleFirstLaunchLocation = async () => {
        const result = await request();
        if (result) {
          const { city, isCatalog } = resolveCityFromLocation(result.coords, result.geocode, cities ?? []);
          queueMicrotask(() => {
            if (isCatalog) {
              setCity(city.id);
            } else {
              setCustomCity(city);
            }
          });
        }
        queueMicrotask(() => {
          completeOnboarding();
        });
      };
      handleFirstLaunchLocation();
    }
  }, [hasOnboarded, request, cities, setCity, setCustomCity, completeOnboarding]);

  // Pede a localização ao ligar "Perto de mim"; se negada, resolveNearbyOrigin
  // cai para o centro da cidade (a tela nunca fica vazia).
  useEffect(() => {
    if (filters.nearMe && status === 'idle') {
      queueMicrotask(() => {
        request();
      });
    }
  }, [filters.nearMe, status, request]);

  const nearbyOrigin = filters.nearMe && city ? resolveNearbyOrigin(coords, status, city) : null;
  const { data: nearby } = useNearbyEstablishments({
    origin: nearbyOrigin,
    radiusKm: filters.maxDistanceKm,
  });

  const nearbyEstablishmentIds = useMemo(
    () => (filters.nearMe && nearby ? new Set(nearby.map((item) => item.id)) : undefined),
    [filters.nearMe, nearby],
  );

  const userCoords = liveCoords || coords;

  const filteredEvents = useMemo(
    () =>
      city
        ? applyEventFilters(events ?? [], filters, {
            now,
            cityId: city.id,
            cityIds: filters.cityIds,
            establishmentsById,
            nearbyEstablishmentIds,
            // Sem isso o sortBy 'distance' era no-op: makeComparator exige
            // userLocation para medir distância e caía para starts_at.
            userLocation: userCoords ?? undefined,
          })
        : [],
    [events, filters, now, city, establishmentsById, nearbyEstablishmentIds, userCoords],
  );

  const cityEstablishments = useMemo(
    () =>
      applyEstablishmentFilters(establishments ?? [], {
        query: barQuery,
        cityId: city?.id,
        cityIds: filters.cityIds,
        attributeIds: filters.attributeIds,
        origin: userCoords,
        sortBy: barSort,
        events: events ?? [],
        now,
      }),
    [
      establishments,
      city,
      barQuery,
      filters.cityIds,
      filters.attributeIds,
      userCoords,
      barSort,
      events,
      now,
    ],
  );

  // Estável enquanto os índices não mudam: junto com EventCard memoizado e os
  // caches de lookup, evita re-render dos cards visíveis a cada tecla da busca.
  const renderEvent = useCallback(
    ({ item }: { item: Event }) => (
      <EventCard
        event={item}
        establishment={establishmentsById[item.establishment_id]}
        styles={musicStylesForEvent(item, stylesById)}
        userCoords={userCoords}
      />
    ),
    [establishmentsById, stylesById, userCoords],
  );

  const commonHeader = useMemo(
    () => (
      <View className="gap-4 pt-2 pb-4">
        <View className="gap-1">
          <Text
            className="font-heading text-foreground text-[28px]"
            style={{ letterSpacing: headingLetterSpacing(28) }}
          >
            O que rola em <Text className="text-primary">{city?.name ?? '…'}</Text> hoje?
          </Text>
          <Text className="font-body text-muted-foreground text-[14px]">
            Cards quentinhos da agenda da noite.
          </Text>
        </View>
        <SearchBar
          value={activeTab === 0 ? filters.query : barQuery}
          onChangeText={activeTab === 0 ? setQuery : setBarQuery}
          hasFilters={hasActiveFilters(filters)}
          onOpenFilters={() => setIsFiltersOpen(true)}
        />
        <SegmentedTabs tabs={['Eventos', 'Bares']} activeIndex={activeTab} onChange={setActiveTab} />
      </View>
    ),
    [city, filters, setQuery, barQuery, activeTab],
  );

  const barsListHeader = useMemo(
    () => (
      <View>
        {commonHeader}
        <View className="gap-4 pb-4">
          <QuickFilterChips showEventFilters={false} />
          <SegmentedTabs
            tabs={ESTABLISHMENT_SORT_OPTIONS.map((option) => ESTABLISHMENT_SORT_LABELS[option])}
            activeIndex={ESTABLISHMENT_SORT_OPTIONS.indexOf(barSort)}
            onChange={(index) => setBarSort(ESTABLISHMENT_SORT_OPTIONS[index])}
          />
          <SectionLabel>
            {`${cityEstablishments.length} ${cityEstablishments.length === 1 ? 'bar encontrado' : 'bares encontrados'}`}
          </SectionLabel>
        </View>
      </View>
    ),
    [commonHeader, cityEstablishments.length, barSort],
  );

  const eventsListHeader = useMemo(
    () => (
      <View>
        {commonHeader}
        <View className="gap-4 pb-4">
          <QuickFilterChips />
          <View className="gap-2.5">
            <SectionLabel>Estilos em alta</SectionLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2"
            >
              {(musicStyles ?? []).map((style) => (
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
            {`${filteredEvents.length} ${filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
          </SectionLabel>
        </View>
      </View>
    ),
    [commonHeader, musicStyles, filters.styleIds, filteredEvents.length, toggleStyle],
  );

  return (
    <Screen header={<ScreenHeader>{city ? <FeedHeader city={city} /> : null}</ScreenHeader>}>
      {activeTab === 0 ? (
        <FlashList
          data={filteredEvents}
          keyExtractor={(event) => event.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={ItemSeparator}
          ListHeaderComponent={eventsListHeader}
          renderItem={renderEvent}
        />
      ) : (
        <FlashList
          data={cityEstablishments}
          keyExtractor={(e) => e.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          ListHeaderComponent={barsListHeader}
          renderItem={({ item }) => <EstablishmentCard establishment={item} />}
        />
      )}
      <FiltersSheet visible={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />
    </Screen>
  );
}
