'use client';

import {
  applyEstablishmentFilters,
  applyEventFilters,
  hasActiveFilters,
  indexById,
  type LatLng,
  musicStylesForEvent,
  resolveNearbyOrigin,
  useActiveCity,
  useEstablishmentsQuery,
  useEventsQuery,
  useFiltersStore,
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

  const filters = useFiltersStore((state) => state.filters);
  const setQuery = useFiltersStore((state) => state.setQuery);
  const toggleStyle = useFiltersStore((state) => state.toggleStyle);

  const { data: events } = useEventsQuery();
  const { data: establishments } = useEstablishmentsQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  const city = useActiveCity();

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
      }),
    [establishments, city, barQuery, filters.cityIds, filters.attributeIds, userCoords],
  );

  const isLoading =
    events === undefined || establishments === undefined || musicStyles === undefined;

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
          ) : filteredEvents.length === 0 ? (
            <EmptyState message="Nenhum evento encontrado." />
          ) : (
            <div className="flex flex-col gap-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  establishment={establishmentsById[event.establishment_id]}
                  styles={musicStylesForEvent(event, stylesById)}
                  userCoords={userCoords}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <QuickFilterChips showEventFilters={false} />

          {isLoading ? (
            <FeedLoading />
          ) : cityEstablishments.length === 0 ? (
            <EmptyState message="Nenhum bar encontrado." />
          ) : (
            <div className="flex flex-col gap-3">
              {cityEstablishments.map((establishment) => (
                <EstablishmentCard key={establishment.id} establishment={establishment} />
              ))}
            </div>
          )}
        </>
      )}

      <FiltersSidebar isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />
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
