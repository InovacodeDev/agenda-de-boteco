'use client';

import { useEventQuery } from '@agenda/core';
import { useParams } from 'next/navigation';

import { EventForm } from '@/components/EventForm';

/**
 * Modo edição. useEventQuery é o hook do core sobre getEvent, já com a key
 * catalogKeys.events.detail(id) — não há por que refazer o wiring aqui.
 * O RLS de events libera rascunho para o dono, então esta tela lê os dois
 * estados; um id de outro bar simplesmente não volta.
 */
export default function EditarEventoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: event, isLoading } = useEventQuery(id);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando…</p>;
  }

  if (!event) {
    return <p className="text-muted-foreground text-sm">Evento não encontrado.</p>;
  }

  return <EventForm event={event} />;
}
