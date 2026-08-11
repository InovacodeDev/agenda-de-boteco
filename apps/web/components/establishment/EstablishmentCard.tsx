'use client';

import {
  buildInstagramProfileUrl,
  type Establishment,
  formatInstagramHandle,
  formatRating,
} from '@agenda/core';
import Link from 'next/link';

import { AttributeChips } from '@/components/ui/AttributeChips';
import { InstagramIcon, StarIcon } from '@/components/ui/icons';

export interface EstablishmentCardProps {
  establishment: Establishment;
}

/** Teto de chips no card; o resto fica para a tela de detalhe. */
const MAX_CARD_ATTRIBUTES = 3;

/** Card compacto de bar (aba Bares), espelha o mobile. */
export function EstablishmentCard({ establishment }: EstablishmentCardProps) {
  const [ratingPart, countPart] = formatRating(
    establishment.rating_avg,
    establishment.rating_count,
  ).split(' ');
  const instagramHandle = formatInstagramHandle(establishment.instagram);
  const instagramUrl = buildInstagramProfileUrl(establishment.instagram);

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
        {/* empty:hidden: sem diferenciais o AttributeChips não renderiza nada e o
            pt-0.5 deixaria um respiro morto no card. */}
        <div className="pt-0.5 empty:hidden">
          <AttributeChips attributes={establishment.attributes} max={MAX_CARD_ATTRIBUTES} />
        </div>
      </div>
    </article>
    </Link>
  );
}
