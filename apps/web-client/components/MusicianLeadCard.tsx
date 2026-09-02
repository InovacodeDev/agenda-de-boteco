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
  'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-elevated text-sm font-medium text-foreground transition-opacity hover:opacity-80';

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
    <article className="shadow-card border-border bg-card flex flex-col gap-3 rounded-2xl border p-5">
      <div>
        <h2 className="font-heading text-foreground text-[17px] font-bold leading-snug">
          {lead.name}
        </h2>
        <p className="text-muted-foreground text-sm">{lead.region}</p>
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

      {lead.price_range ? (
        <p className="text-muted-foreground text-sm">{lead.price_range}</p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-2">
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
