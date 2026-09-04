'use client';

import {
  buildInstagramProfileUrl,
  buildWhatsAppUrl,
  formatInstagramHandle,
  type MusicianLeadRow,
  type MusicStyle,
} from '@agenda/core';
import { InstagramLogoIcon, WhatsappLogoIcon } from '@phosphor-icons/react';

const LINK_ACTION =
  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-elevated text-[13px] font-medium text-foreground transition-opacity hover:opacity-80';

export function MusicianLeadCard({
  lead,
  styleById,
}: {
  lead: MusicianLeadRow;
  styleById: Map<string, MusicStyle>;
}) {
  // wa.me exige DDI; musician_leads.phone é só DDD+número (ver RPC create_musician_lead).
  const whatsappUrl = buildWhatsAppUrl(`55${lead.phone.replace(/\D/g, '')}`);
  const instagramUrl = buildInstagramProfileUrl(lead.instagram);
  const instagramHandle = formatInstagramHandle(lead.instagram);

  return (
    <article className="shadow-card border-border bg-card flex flex-col gap-2.5 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-foreground line-clamp-2 text-sm font-bold leading-snug">
            {lead.name}
          </p>
          <p className="text-muted-foreground truncate text-[13px] leading-snug">{lead.region}</p>
        </div>

        {lead.price_range ? (
          <span className="text-primary shrink-0 whitespace-nowrap text-right text-sm font-semibold">
            {lead.price_range}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {lead.music_style_ids.map((id) => {
          const style = styleById.get(id);
          return (
            <span
              key={id}
              className="bg-surface-elevated text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium"
            >
              {style ? `${style.emoji} ${style.name}` : id}
            </span>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_ACTION}
        >
          <WhatsappLogoIcon size={16} weight="regular" aria-hidden />
          WhatsApp
        </a>

        {instagramUrl && instagramHandle ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_ACTION}
          >
            <InstagramLogoIcon size={16} weight="regular" aria-hidden />
            {instagramHandle}
          </a>
        ) : null}
      </div>
    </article>
  );
}
