'use client';

import type { Event } from '@agenda/core';
import { Select } from '@agenda/shared-ui';
import { EyeIcon, HeartIcon, MapPinIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

import { EventMetricsDrawer } from '@/components/EventMetricsDrawer';
import { EventMetricsRow } from '@/components/EventMetricsRow';
import { MetricsSparkline } from '@/components/MetricsSparkline';
import { useOwnedEvents } from '@/hooks/use-owned-events';
import { aggregateMetrics, useOwnedFavoritesCount, useOwnedMetrics } from '@/hooks/use-owned-metrics';

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

export default function MetricasPage() {
  const [sinceDays, setSinceDays] = useState('30');
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);

  const { data: events } = useOwnedEvents();
  const { data: rows, isPending } = useOwnedMetrics(Number(sinceDays));
  const { data: favoritesByEvent } = useOwnedFavoritesCount();

  const { byEvent, byDay, totals } = useMemo(
    () => aggregateMetrics(rows ?? [], favoritesByEvent ?? {}),
    [rows, favoritesByEvent],
  );

  const eventsById = useMemo(
    () => new Map((events ?? []).map((event) => [event.id, event])),
    [events],
  );

  const activeSummary = activeEvent
    ? (byEvent.find((summary) => summary.eventId === activeEvent.id) ?? null)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-foreground text-2xl font-bold">Métricas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Visualizações e cliques dos seus eventos, somando app e site.
          </p>
        </div>
        <Select value={sinceDays} onValueChange={setSinceDays} className="w-48">
          {PERIOD_OPTIONS.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </header>

      {isPending ? (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <EyeIcon size={14} weight="regular" aria-hidden />
                Visualizações
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">{totals.views}</p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <MapPinIcon size={14} weight="regular" aria-hidden />
                Cliques
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">
                {totals.clicksByKind.click_map + totals.clicksByKind.click_contact + totals.clicksByKind.click_share}
              </p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5">
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-medium uppercase">
                <HeartIcon size={14} weight="regular" aria-hidden />
                Favoritos
              </span>
              <p className="text-foreground mt-2 text-2xl font-bold">{totals.favorites}</p>
            </div>
            <div className="shadow-card border-border bg-card rounded-2xl border p-5 sm:col-span-2 lg:col-span-1">
              <span className="text-muted-foreground text-xs font-medium uppercase">Evolução</span>
              <div className="mt-2">
                <MetricsSparkline data={byDay} />
              </div>
            </div>
          </section>

          <section className="shadow-card border-border bg-card overflow-hidden rounded-2xl border">
            {byEvent.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nenhum dado de métrica no período selecionado.
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left text-xs font-medium uppercase">
                    <th className="px-5 py-3">Evento</th>
                    <th className="px-0 py-3">Views</th>
                    <th className="px-0 py-3">Cliques</th>
                    <th className="px-0 py-3">Favoritos</th>
                    <th className="px-0 py-3" />
                  </tr>
                </thead>
                <tbody className="px-5">
                  {byEvent.map((summary) => {
                    const event = eventsById.get(summary.eventId);
                    if (!event) return null;
                    return (
                      <EventMetricsRow
                        key={summary.eventId}
                        event={event}
                        summary={summary}
                        onViewDetails={() => setActiveEvent(event)}
                      />
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <EventMetricsDrawer
        event={activeEvent}
        summary={activeSummary}
        byDay={byDay}
        open={activeEvent !== null}
        onOpenChange={(open) => {
          if (!open) setActiveEvent(null);
        }}
      />
    </div>
  );
}
