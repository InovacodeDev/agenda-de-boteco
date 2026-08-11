'use client';

import {
  buildInstagramProfileUrl,
  type Establishment,
  formatInstagramHandle,
  formatRating,
  useEstablishmentStatusLight,
} from '@agenda/core';
import Link from 'next/link';

import { AttributeChips } from '@/components/ui/AttributeChips';
import { InstagramIcon, StarIcon } from '@/components/ui/icons';
import { StatusLightBadge } from '@/components/ui/StatusLightBadge';

export interface EstablishmentCardProps {
  establishment: Establishment;
}

/**
 * Teto de chips no card; o resto fica para a tela de detalhe. Menor que o do
 * card de evento porque aqui o semáforo divide a mesma linha estreita.
 */
const MAX_CARD_ATTRIBUTES = 2;

/** Card compacto de bar (aba Bares), espelha o mobile. */
export function EstablishmentCard({ establishment }: EstablishmentCardProps) {
  const [ratingPart, countPart] = formatRating(
    establishment.rating_avg,
    establishment.rating_count,
  ).split(' ');
  const instagramHandle = formatInstagramHandle(establishment.instagram);
  const instagramUrl = buildInstagramProfileUrl(establishment.instagram);
  const statusLight = useEstablishmentStatusLight(establishment.opening_hours);

  return (
    <Link
      href={`/establishment/${establishment.id}`}
      className="block transition-opacity hover:opacity-90"
    >
    <article className="flex gap-3 rounded-2xl bg-card p-3">
      {/* ponytail: <img> evita config de remotePatterns do next/image p/ logos externos */}
      <img
        src={establishment.logo_url}
        alt={establishment.name}
        className="h-20 w-20 shrink-0 rounded-xl object-cover"
      />
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        <p className="text-[11px] font-[family-name:var(--font-body)] text-muted-foreground">
          {establishment.ambiance} · {establishment.price_range}
        </p>
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground">
            {establishment.name}
          </p>
          {instagramHandle && instagramUrl ? (
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                window.open(instagramUrl, '_blank', 'noreferrer');
              }}
              aria-label={`Abrir ${instagramHandle} no Instagram`}
              className="shrink-0 text-primary transition-opacity hover:opacity-80"
            >
              <InstagramIcon size={14} />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <StarIcon size={14} className="text-accent" />
            <span className="text-[13px] font-[family-name:var(--font-body)] font-semibold text-foreground">
              {ratingPart}
            </span>
            <span className="text-[13px] font-[family-name:var(--font-body)] text-muted-foreground">
              {countPart}
            </span>
          </span>
          <span className="truncate text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
            {establishment.neighborhood}
          </span>
        </div>
        {/* Semáforo ancorado no extremo direito da linha dos diferenciais. */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="min-w-0 flex-1 empty:hidden">
            <AttributeChips attributes={establishment.attributes} max={MAX_CARD_ATTRIBUTES} />
          </div>
          <StatusLightBadge light={statusLight} />
        </div>
      </div>
    </article>
    </Link>
  );
}
