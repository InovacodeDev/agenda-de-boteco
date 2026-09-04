'use client';

import { type Event, formatEventDate } from '@agenda/core';
import {
  ArrowsClockwiseIcon,
  EyeIcon,
  ImageIcon,
  PencilSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';

// Rascunho fica neutro de propósito — precisa parecer inacabado para o dono ver
// de longe o que ainda não está no ar. Publicado usa a cor primária da marca.
const STATUS: Record<Event['status'], { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-surface-elevated text-muted-foreground' },
  published: { label: 'Publicado', className: 'bg-primary text-primary-foreground' },
};

const ICON_ACTION =
  'flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted-foreground';

export function EventCard({ event, onDelete }: { event: Event; onDelete: () => void }) {
  const status = STATUS[event.status];
  // Horário 00:00 é o default de quem não informou hora (o campo é opcional no
  // formulário), então não vale mostrar "• 00:00" como se fosse programação.
  const startsAtMidnight = new Date(event.starts_at).getHours() === 0 &&
    new Date(event.starts_at).getMinutes() === 0;
  const isDraft = event.status === 'draft';

  return (
    <article className="shadow-card border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
      <div className="bg-surface relative flex h-40 items-center justify-center">
        {event.banner_url ? (
          // <img> e não next/image: a URL vem do bucket do Supabase, que exigiria
          // configurar remotePatterns (mesma razão do ImageDrop).
          <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon size={32} weight="regular" className="text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-foreground min-w-0 flex-1 text-[17px] leading-snug font-bold">
            {event.name}
          </h2>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-muted-foreground text-sm">
            {formatEventDate(event.starts_at, !startsAtMidnight)}
          </p>
          {event.recurrence_group_id ? (
            <span className="text-muted-foreground bg-surface-elevated inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium">
              <ArrowsClockwiseIcon size={11} weight="bold" aria-hidden />
              Série
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            href={`/events/${event.id}`}
            className="bg-surface-elevated text-foreground flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          >
            <PencilSimpleIcon size={16} weight="regular" aria-hidden />
            Editar
          </Link>

          {/* Preview público: rota do app consumidor, que vive fora do basePath
              /client — <a> em vez de next/link, que prefixaria o href. Rascunho
              não tem página pública, então o olho fica desabilitado (<span>: <a>
              sem href não é focável nem anunciável como link). */}
          {isDraft ? (
            <span
              aria-disabled
              title="Publique o evento para ver a página pública."
              className={ICON_ACTION + ' cursor-not-allowed opacity-40'}
            >
              <EyeIcon size={18} weight="regular" aria-hidden />
            </span>
          ) : (
            <a
              href={`/app/event/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Ver página pública"
              aria-label={`Ver página pública de ${event.name}`}
              className={ICON_ACTION}
            >
              <EyeIcon size={18} weight="regular" aria-hidden />
            </a>
          )}

          <button
            type="button"
            onClick={onDelete}
            title="Excluir evento"
            aria-label={`Excluir ${event.name}`}
            className={`${ICON_ACTION} text-destructive hover:text-destructive hover:opacity-80`}
          >
            <TrashIcon size={18} weight="regular" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
