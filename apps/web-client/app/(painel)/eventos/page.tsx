'use client';

import { type Event, getFriendlyErrorMessage } from '@agenda/core';
import { CalendarBlankIcon, PlusIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useDeleteOwnedEvent,
  useDeleteOwnedEventGroup,
  useOwnedEvents,
} from '@/hooks/use-owned-events';

const NEW_EVENT_BUTTON =
  'bg-primary text-primary-foreground shadow-neon inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90';

export default function EventosPage() {
  const { data: events, isPending } = useOwnedEvents();
  const deleteEvent = useDeleteOwnedEvent();
  const deleteGroup = useDeleteOwnedEventGroup();
  // Evento aguardando confirmação de exclusão. Só a série abre diálogo próprio;
  // o evento único resolve no window.confirm e nunca chega a este estado.
  const [pendingSeries, setPendingSeries] = useState<Event | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = deleteEvent.isPending || deleteGroup.isPending;

  const run = async (action: Promise<void>) => {
    setErrorMessage(null);
    try {
      await action;
      setPendingSeries(null);
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  };

  /**
   * Evento único: window.confirm nativo basta (acessível, sem modal novo). Série:
   * a decisão tem duas saídas (esta ocorrência ou a série a partir de hoje), que
   * o confirm de dois botões não expressa — aí abre o diálogo abaixo.
   */
  const handleDelete = (event: Event) => {
    if (event.recurrence_group_id) {
      setErrorMessage(null);
      setPendingSeries(event);
      return;
    }
    if (!window.confirm(`Excluir "${event.name}"? Essa ação não pode ser desfeita.`)) return;
    void run(deleteEvent.mutateAsync(event.id));
  };

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie a programação do seu bar.
          </p>
        </div>
        <Link href="/eventos/novo" className={NEW_EVENT_BUTTON}>
          <PlusIcon size={16} weight="bold" aria-hidden />
          Novo evento
        </Link>
      </header>

      {errorMessage ? <p className="text-destructive text-[13px]">{errorMessage}</p> : null}

      {isPending ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : events && events.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onDelete={() => handleDelete(event)} />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<CalendarBlankIcon size={32} weight="regular" aria-hidden />}
          message="Nenhum evento por aqui ainda. Cadastre o primeiro e apareça no feed."
        >
          <Link href="/eventos/novo" className={NEW_EVENT_BUTTON}>
            <PlusIcon size={16} weight="bold" aria-hidden />
            Criar primeiro evento
          </Link>
        </EmptyState>
      )}

      {pendingSeries ? (
        <div
          role="dialog"
          aria-modal
          aria-labelledby="excluir-serie-titulo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="shadow-card border-border bg-card w-full max-w-md rounded-2xl border p-6">
            <h2 id="excluir-serie-titulo" className="font-heading text-foreground text-lg font-bold">
              Excluir evento da série
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              &quot;{pendingSeries.name}&quot; se repete. Escolha o que apagar — a ação não pode ser
              desfeita.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(deleteEvent.mutateAsync(pendingSeries.id))}
                className="bg-destructive text-destructive-foreground rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Apagar só esta ocorrência
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(
                    // recurrence_group_id existe: é o que abriu este diálogo.
                    deleteGroup.mutateAsync(pendingSeries.recurrence_group_id ?? ''),
                  )
                }
                className="bg-destructive text-destructive-foreground rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                Apagar a série inteira a partir de hoje
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPendingSeries(null)}
                className="text-muted-foreground hover:text-foreground rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
