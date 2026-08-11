'use client';

import { type Event, formatPrice, formatRelativeDay, formatTime, type MusicStyle } from '@agenda/core';
import Link from 'next/link';

export interface EstablishmentDetailAgendaItemProps {
  event: Event;
  styles: MusicStyle[];
}

/** Linha da agenda do bar (thumb + estilos + nome + data·hora·preço). Espelha o AgendaItem do mobile. */
export function EstablishmentDetailAgendaItem({ event, styles }: EstablishmentDetailAgendaItemProps) {
  return (
    <Link
      href={`/event/${event.id}`}
      aria-label={`Evento ${event.name}`}
      className="flex gap-3 rounded-2xl bg-card p-3 transition-opacity hover:opacity-90"
    >
      {/* ponytail: <img> evita config de remotePatterns do next/image p/ banners externos */}
      <img
        src={event.banner_url}
        alt={event.name}
        className="h-14 w-14 shrink-0 rounded-xl object-cover"
      />
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        <p className="text-[11px] font-[family-name:var(--font-body)] text-muted-foreground">
          {styles.map((style) => style.name).join(' ')}
        </p>
        <p className="truncate text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          {event.name}
        </p>
        <p className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
          {formatRelativeDay(event.starts_at)} · {formatTime(event.starts_at)} ·{' '}
          {formatPrice(event.cover_charge)}
        </p>
      </div>
    </Link>
  );
}
