'use client';

import {
  applyEstablishmentFilters,
  applyEventFilters,
  DEFAULT_ESTABLISHMENT_SORT,
  ESTABLISHMENT_SORT_LABELS,
  ESTABLISHMENT_SORT_OPTIONS,
  type EstablishmentSortBy,
  flattenPages,
  hasActiveFilters,
  indexById,
  isVirtualCityId,
  type LatLng,
  musicStylesForEvent,
  resolveNearbyOrigin,
  useActiveCity,
  useEstablishmentsQuery,
  useEventsQuery,
  useFiltersStore,
  useInfiniteScrollSentinel,
  useMusicStylesQuery,
  useNearbyEstablishments,
} from '@agenda/core';
import { useEffect, useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { EventCard } from '@/components/event/EventCard';
import { QuickFilterChips } from '@/components/feed/QuickFilterChips';
import { SearchBar } from '@/components/feed/SearchBar';
import { StyleCard } from '@/components/feed/StyleCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FiltersSidebar } from '@/components/filters/FiltersSidebar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState(0); // 0 = Eventos, 1 = Bares
  const [barQuery, setBarQuery] = useState('');
  const [barSort, setBarSort] = useState<EstablishmentSortBy>(DEFAULT_ESTABLISHMENT_SORT);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        queueMicrotask(() => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const city = useActiveCity();
  const filters = useFiltersStore((state) => state.filters);
  const setQuery = useFiltersStore((state) => state.setQuery);
  const toggleStyle = useFiltersStore((state) => state.toggleStyle);

  const effectiveCityId =
    filters.cityIds && filters.cityIds.length > 0
      ? (filters.cityIds.length === 1 ? filters.cityIds[0] : undefined)
      : (city && !isVirtualCityId(city.id) ? city.id : undefined);

  const eventsQuery = useEventsQuery();
  const events = flattenPages(eventsQuery.data);
  const establishmentsQuery = useEstablishmentsQuery(effectiveCityId);
  const establishments = flattenPages(establishmentsQuery.data);
  const { data: musicStyles } = useMusicStylesQuery();

  const eventsSentinelRef = useInfiniteScrollSentinel({
    fetchNextPage: eventsQuery.fetchNextPage,
    hasNextPage: eventsQuery.hasNextPage,
    isFetchingNextPage: eventsQuery.isFetchingNextPage,
  });
  const establishmentsSentinelRef = useInfiniteScrollSentinel({
    fetchNextPage: establishmentsQuery.fetchNextPage,
    hasNextPage: establishmentsQuery.hasNextPage,
    isFetchingNextPage: establishmentsQuery.isFetchingNextPage,
  });

  // "agora" estável por render (o feed web não precisa do tick de minuto do mobile).
  const now = useMemo(() => new Date(), []);

  const establishmentsById = useMemo(() => indexById(establishments ?? []), [establishments]);
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  // ponytail: geolocalização web fica para a tela de filtros/Fase 2 — sem GPS,
  // a origem do "Perto de mim" é o centro da cidade (resolveNearbyOrigin idle).
  const nearbyOrigin = filters.nearMe && city ? resolveNearbyOrigin(userCoords, userCoords ? 'granted' : 'idle', city) : null;
  const { data: nearby } = useNearbyEstablishments({
    origin: nearbyOrigin,
    radiusKm: filters.maxDistanceKm,
  });

  const nearbyEstablishmentIds = useMemo(
    () => (filters.nearMe && nearby ? new Set(nearby.map((item) => item.id)) : undefined),
    [filters.nearMe, nearby],
  );

  const filteredEvents = useMemo(
    () =>
      city
         ? applyEventFilters(events ?? [], filters, {
            now,
            cityId: city.id,
            cityIds: filters.cityIds,
            establishmentsById,
            nearbyEstablishmentIds,
          })
        : [],
    [events, filters, now, city, establishmentsById, nearbyEstablishmentIds],
  );

  const cityEstablishments = useMemo(
    () =>
      applyEstablishmentFilters(establishments ?? [], {
        query: barQuery,
        cityId: city?.id,
        cityIds: filters.cityIds,
        attributeIds: filters.attributeIds,
        origin: userCoords,
        maxDistanceKm: filters.maxDistanceKm,
        minRating: filters.minRating,
        openNow: filters.openNow,
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
      filters.maxDistanceKm,
      filters.minRating,
      filters.openNow,
      userCoords,
      barSort,
      events,
      now,
    ],
  );

  const isLoading = eventsQuery.isPending || establishmentsQuery.isPending || musicStyles === undefined;

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
          O que rola em <span className="text-primary">{city?.name ?? '…'}</span> hoje?
        </h1>
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Cards quentinhos da agenda da noite.
        </p>
      </header>

      <SearchBar
        value={activeTab === 0 ? filters.query : barQuery}
        onChange={activeTab === 0 ? setQuery : setBarQuery}
        onOpenFilters={() => setIsFiltersOpen(true)}
        hasFilters={hasActiveFilters(filters)}
      />

      <SegmentedTabs tabs={['Eventos', 'Bares']} activeIndex={activeTab} onChange={setActiveTab} />

      {activeTab === 0 ? (
        <>
          <QuickFilterChips />

          <div className="flex flex-col gap-2.5">
            <SectionLabel>Estilos em alta</SectionLabel>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(musicStyles ?? []).map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  selected={filters.styleIds.includes(style.id)}
                  onClick={() => toggleStyle(style.id)}
                />
              ))}
            </div>
          </div>

          <SectionLabel>
            {`${filteredEvents.length} ${filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`}
          </SectionLabel>

          {isLoading ? (
            <FeedLoading />
          ) : (
            <div className="flex flex-col gap-4">
              {filteredEvents.length === 0 ? (
                <EmptyState message="Nenhum evento encontrado." />
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    establishment={establishmentsById[event.establishment_id]}
                    styles={musicStylesForEvent(event, stylesById)}
                    userCoords={userCoords}
                  />
                ))
              )}
              {/*
               * Sentinela sempre montada quando ha proxima pagina, mesmo com a
               * lista filtrada vazia: o filtro por cidade e client-side sobre
               * o catalogo global paginado — sem isso, um filtro que zera a
               * lista visivel esconde a sentinela e trava fetchNextPage pra
               * sempre, mesmo havendo paginas com resultado la na frente.
               */}
              {eventsQuery.hasNextPage ? (
                <div ref={eventsSentinelRef} aria-hidden className="h-px" />
              ) : null}
              {eventsQuery.isFetchingNextPage ? (
                <p className="text-muted-foreground py-4 text-center text-[13px]">Carregando mais…</p>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <>
          <QuickFilterChips showEventFilters={false} />

          <SegmentedTabs
            tabs={ESTABLISHMENT_SORT_OPTIONS.map((option) => ESTABLISHMENT_SORT_LABELS[option])}
            activeIndex={ESTABLISHMENT_SORT_OPTIONS.indexOf(barSort)}
            onChange={(index) => setBarSort(ESTABLISHMENT_SORT_OPTIONS[index])}
          />

          {isLoading ? (
            <FeedLoading />
          ) : (
            <div className="flex flex-col gap-3">
              {cityEstablishments.length === 0 ? (
                <EmptyState message="Nenhum bar encontrado." />
              ) : (
                cityEstablishments.map((establishment) => (
                  <EstablishmentCard key={establishment.id} establishment={establishment} />
                ))
              )}
              {establishmentsQuery.hasNextPage ? (
                <div ref={establishmentsSentinelRef} aria-hidden className="h-px" />
              ) : null}
              {establishmentsQuery.isFetchingNextPage ? (
                <p className="text-muted-foreground py-4 text-center text-[13px]">Carregando mais…</p>
              ) : null}
            </div>
          )}
        </>
      )}

      <FiltersSidebar
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        showEventFilters={activeTab === 0}
      />
    </section>
  );
}

function FeedLoading() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[340px] animate-pulse rounded-2xl bg-card" />
      ))}
    </div>
  );
}
