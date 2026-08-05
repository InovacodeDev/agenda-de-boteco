'use client';
// Lote E — detalhe de evento

import {
  buildDirectionsUrl,
  formatPrice,
  formatRelativeDay,
  formatTimeRange,
  indexById,
  musicStylesForEvent,
  useEstablishmentQuery,
  useEventAttractionsQuery,
  useEventQuery,
  useFavoritesStore,
  useMusicStylesQuery,
} from '@agenda/core';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';

import { EventDetailCarousel } from '@/components/event/EventDetailCarousel';
import { GradientBadge } from '@/components/ui/GradientBadge';
import {
  CalendarIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  TicketIcon,
} from '@/components/ui/icons';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// ponytail: ícones ausentes no icons.tsx compartilhado — inline no lote p/ não tocar o shared.
function ArrowLeftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
function NavIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 11 18-8-8 18-2-8-8-2Z" />
    </svg>
  );
}
function StoreIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 9h18l-1 2H4L3 9ZM5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
    </svg>
  );
}
function MusicNoteIcon({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l11-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
    </svg>
  );
}

function InfoCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl bg-card p-3.5">
      <span className="flex items-center gap-1.5 text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={`text-[14px] font-[family-name:var(--font-body)] font-semibold ${
          highlight ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const eventQuery = useEventQuery(id);
  const event = eventQuery.data;
  const establishmentQuery = useEstablishmentQuery(event?.establishment_id ?? '');
  const establishment = establishmentQuery.data;
  const { data: musicStyles } = useMusicStylesQuery();
  const stylesById = useMemo(() => indexById(musicStyles ?? []), [musicStyles]);
  const { data: attractions } = useEventAttractionsQuery(event?.id ?? '');
  const photos = useMemo(
    () => [event?.banner_url, ...(event?.photo_urls ?? [])].filter(Boolean) as string[],
    [event],
  );

  const isFavorite = useFavoritesStore((state) =>
    event ? state.eventIds.includes(event.id) : false,
  );
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);
  const requireAuth = useRequireAuth();

  const isLoading = eventQuery.isLoading || (!!event && establishmentQuery.isLoading);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Carregando…
        </p>
      </div>
    );
  }

  if (!event || !establishment) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          Evento não encontrado.
        </p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-full bg-foreground px-5 py-2 text-[13px] font-[family-name:var(--font-body)] font-medium text-primary-foreground transition-opacity hover:opacity-80"
        >
          Voltar ao feed
        </button>
      </div>
    );
  }

  const styles = musicStylesForEvent(event, stylesById);

  const badge = event.courtesy
    ? { label: 'Cortesia', text: event.courtesy }
    : event.promo
      ? { label: 'Promoção', text: event.promo }
      : null;

  return (
    <article className="flex flex-col gap-4 pb-4">
      <div className="relative h-[260px] overflow-hidden rounded-2xl">
        <EventDetailCarousel photos={photos} accessibilityLabel={event.name} />

        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/40 text-foreground transition-opacity hover:opacity-80"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
          onClick={() => requireAuth(() => toggleEvent(event.id))}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/40 transition-opacity hover:opacity-80"
        >
          <HeartIcon size={18} filled={isFavorite} className={isFavorite ? 'text-primary' : 'text-foreground'} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-4">
          {styles.map((style) => (
            <span
              key={style.id}
              className="rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-[family-name:var(--font-body)] font-medium text-foreground"
            >
              {style.emoji}
              {style.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-[24px] font-[family-name:var(--font-heading)] font-bold text-foreground">
          {event.name}
        </h1>
        <p className="text-[15px] font-[family-name:var(--font-body)] text-muted-foreground">
          {event.attraction}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <InfoCard label="Data" value={formatRelativeDay(event.starts_at)} icon={<CalendarIcon size={13} />} />
          <InfoCard label="Horário" value={formatTimeRange(event.starts_at, event.ends_at)} icon={<ClockIcon size={13} />} />
        </div>
        <div className="flex gap-3">
          <Link href={`/establishment/${establishment.id}`} className="flex flex-1 transition-opacity hover:opacity-90">
            <InfoCard
              label="Local"
              value={`${establishment.name} · ${establishment.neighborhood}`}
              icon={<MapPinIcon size={13} />}
            />
          </Link>
          <InfoCard label="Entrada" value={formatPrice(event.cover_charge)} icon={<TicketIcon size={13} />} highlight />
        </div>
      </div>

      {badge ? (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-card p-4">
          <GradientBadge label={badge.label} />
          <p className="text-[14px] font-[family-name:var(--font-body)] text-foreground">{badge.text}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h2 className="text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-wide text-muted-foreground">
          Sobre o evento
        </h2>
        <p className="text-[14px] font-[family-name:var(--font-body)] leading-5 text-foreground">
          {event.description}
        </p>
      </div>

      {attractions && attractions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-[12px] font-[family-name:var(--font-body)] font-semibold uppercase tracking-wide text-muted-foreground">
            Outras atrações
          </h2>
          <div className="flex flex-col gap-1.5">
            {attractions.map((attraction) => (
              <div key={attraction.id} className="flex items-center gap-2">
                <span className="text-primary">
                  <MusicNoteIcon size={13} />
                </span>
                <span className="text-[14px] font-[family-name:var(--font-body)] text-foreground">
                  {attraction.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={buildDirectionsUrl({ lat: establishment.lat, lng: establishment.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full border-[0.5px] border-foreground/50 bg-background px-4 py-3 text-[14px] font-[family-name:var(--font-body)] font-medium text-foreground transition-opacity hover:opacity-80"
        >
          <NavIcon size={16} />
          Como chegar
        </a>
        <button
          type="button"
          onClick={() => router.push(`/establishment/${establishment.id}`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[14px] font-[family-name:var(--font-body)] font-medium text-primary-foreground transition-opacity hover:opacity-80"
        >
          <StoreIcon size={16} />
          Ver estabelecimento
        </button>
      </div>
    </article>
  );
}
