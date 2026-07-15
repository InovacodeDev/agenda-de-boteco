'use client';

import {
  type Establishment,
  type Event,
  formatPrice,
  formatRelativeDay,
  formatTimeRange,
  haversineDistanceKm,
  type LatLng,
  type MusicStyle,
  useFavoritesStore,
} from '@agenda/core';
import { useMemo } from 'react';

import { GradientBadge } from '@/components/ui/GradientBadge';
import {
  CalendarIcon,
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  TicketIcon,
} from '@/components/ui/icons';

export interface EventCardProps {
  event: Event;
  establishment: Establishment;
  styles: MusicStyle[];
  userCoords?: LatLng | null;
}

function FooterItem({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span className={className}>{children}</span>
    </div>
  );
}

/** Card de evento do feed, espelha o mobile em DOM/Tailwind. */
export function EventCard({
  event,
  establishment,
  styles,
  userCoords,
}: EventCardProps) {
  const isFavorite = useFavoritesStore((state) => state.eventIds.includes(event.id));
  const toggleEvent = useFavoritesStore((state) => state.toggleEvent);

  const badge = event.courtesy ? 'Cortesia' : event.promo ? 'Promoção' : null;
  const price = formatPrice(event.cover_charge);

  const distanceText = useMemo(() => {
    if (!userCoords) return null;
    const dist = haversineDistanceKm(
      { lat: establishment.lat, lng: establishment.lng },
      userCoords,
    );
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m de mim`;
    }
    return `${dist.toFixed(1).replace('.', ',')}km de mim`;
  }, [establishment.lat, establishment.lng, userCoords]);

  return (
    <article className="overflow-hidden rounded-2xl bg-card">
      <div className="relative h-[340px]">
        {/* ponytail: <img> evita config de remotePatterns do next/image p/ banners externos */}
        <img
          src={event.banner_url}
          alt={event.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.85))]" />

        <div className="relative flex h-full flex-col justify-between p-3.5">
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap gap-1.5">
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
            <button
              type="button"
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar evento'}
              // ponytail: gate de auth no favoritar vem com a tela de login (Task 10)
              onClick={() => toggleEvent(event.id)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/40 transition-opacity hover:opacity-80"
            >
              <HeartIcon
                size={18}
                filled={isFavorite}
                className={isFavorite ? 'text-primary' : 'text-foreground'}
              />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {badge ? <GradientBadge label={badge} /> : null}
            <h3 className="text-[22px] font-[family-name:var(--font-heading)] font-bold text-foreground">
              {event.name}
            </h3>
            <p className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
              {event.attraction} · {establishment.name}
            </p>
          </div>
        </div>
      </div>

      {distanceText ? (
        <div className="bg-surface/50 border-border flex items-center gap-1.5 border-b px-4 py-1.5">
          <svg
            viewBox="0 0 24 24"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="font-[family-name:var(--font-body)] text-[12px] text-muted-foreground">{distanceText}</span>
        </div>
      ) : null}

      <div className="flex justify-between bg-popover px-4 py-3">
        <div className="flex flex-col gap-2">
          <FooterItem
            icon={<CalendarIcon size={14} />}
            className="text-[13px] font-[family-name:var(--font-body)] text-foreground"
          >
            {formatRelativeDay(event.starts_at)}
          </FooterItem>
          <FooterItem
            icon={<MapPinIcon size={14} />}
            className="text-[13px] font-[family-name:var(--font-body)] text-foreground"
          >
            {establishment.neighborhood}
          </FooterItem>
        </div>
        <div className="flex flex-col items-end gap-2">
          <FooterItem
            icon={<ClockIcon size={14} />}
            className="text-[13px] font-[family-name:var(--font-body)] text-foreground"
          >
            {formatTimeRange(event.starts_at, event.ends_at)}
          </FooterItem>
          <FooterItem
            icon={<TicketIcon size={14} />}
            className="text-[13px] font-[family-name:var(--font-body)] font-semibold text-primary"
          >
            {price}
          </FooterItem>
        </div>
      </div>
    </article>
  );
}
