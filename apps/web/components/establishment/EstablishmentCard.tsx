'use client';

import { type Establishment, formatRating, getAttributeMeta } from '@agenda/core';
import Link from 'next/link';

import { AttributeIcon, StarIcon } from '@/components/ui/icons';

export interface EstablishmentCardProps {
  establishment: Establishment;
}

/** Atributos mostrados no card; o resto fica para a tela de detalhe. */
const MAX_CARD_ATTRIBUTES = 3;

/** Card compacto de bar (aba Bares), espelha o mobile. */
export function EstablishmentCard({ establishment }: EstablishmentCardProps) {
  const [ratingPart, countPart] = formatRating(
    establishment.rating_avg,
    establishment.rating_count,
  ).split(' ');

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
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        <p className="text-[11px] font-[family-name:var(--font-body)] text-muted-foreground">
          {establishment.ambiance} · {establishment.price_range}
        </p>
        <p className="truncate text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground">
          {establishment.name}
        </p>
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
        {establishment.attributes.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {establishment.attributes.slice(0, MAX_CARD_ATTRIBUTES).map((attributeId) => {
              const meta = getAttributeMeta(attributeId);
              return (
                <span
                  key={attributeId}
                  title={meta.description}
                  className="flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-[family-name:var(--font-body)] text-muted-foreground"
                >
                  <AttributeIcon icon={meta.icon} size={10} />
                  {meta.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </article>
    </Link>
  );
}
