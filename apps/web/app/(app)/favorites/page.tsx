'use client';

import {
  indexById,
  musicStylesForEvent,
  useEstablishmentsQuery,
  useEventsQuery,
  useFavoritesStore,
  useMusicStylesQuery,
} from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { EventCard } from '@/components/event/EventCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { HeartIcon } from '@/components/ui/icons';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';

export default function FavoritesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0); // 0 = Eventos, 1 = Bares

  const eventIds = useFavoritesStore((state) => state.eventIds);
  const establishmentIds = useFavoritesStore((state) => state.establishmentIds);

  const { data: events } = useEventsQuery();
  const { data: establishments } = useEstablishmentsQuery();
  const { data: musicStyles } = useMusicStylesQuery();

  const establishmentsById = useMemo(() => indexById(establishments ?? []), [establishments]);
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);

  // Descarta eventos cujo estabelecimento ainda não chegou (latências de query
  // distintas) ou sumiu no servidor — EventCard exige `establishment`.
  const favoriteEvents = useMemo(
    () =>
      (events ?? []).filter(
        (event) => eventIds.includes(event.id) && establishmentsById[event.establishment_id],
      ),
    [events, eventIds, establishmentsById],
  );
  const favoriteEstablishments = useMemo(
    () => (establishments ?? []).filter((e) => establishmentIds.includes(e.id)),
    [establishments, establishmentIds],
  );

  const showingEvents = activeTab === 0;
  const isEmpty = showingEvents
    ? favoriteEvents.length === 0
    : favoriteEstablishments.length === 0;

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
          Favoritos
        </h1>
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Seus eventos e bares salvos.
        </p>
      </header>

      <SegmentedTabs
        tabs={[`Eventos (${favoriteEvents.length})`, `Bares (${favoriteEstablishments.length})`]}
        activeIndex={activeTab}
        onChange={setActiveTab}
      />

      {isEmpty ? (
        <EmptyState
          icon={<HeartIcon size={32} />}
          message={
            showingEvents
              ? 'Você ainda não favoritou nenhum evento.'
              : 'Você ainda não favoritou nenhum bar.'
          }
          actionLabel="Ver feed"
          onAction={() => router.push('/')}
        />
      ) : showingEvents ? (
        <div className="flex flex-col gap-4">
          {favoriteEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              establishment={establishmentsById[event.establishment_id]}
              styles={musicStylesForEvent(event, stylesById)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {favoriteEstablishments.map((establishment) => (
            <EstablishmentCard key={establishment.id} establishment={establishment} />
          ))}
        </div>
      )}
    </section>
  );
}
