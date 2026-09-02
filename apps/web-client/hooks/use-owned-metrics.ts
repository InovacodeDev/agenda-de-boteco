'use client';

import {
  listOwnedFavoritesCount,
  listOwnedMetrics,
  type MetricEvent,
  type MetricKind,
} from '@agenda/core';
import { useQuery } from '@tanstack/react-query';

import { useOwnedEstablishmentId } from './use-owned-establishment';
import { useOwnedEvents } from './use-owned-events';

/**
 * Query keys do painel. Fica local (Regra dos 3 do AGENTS.md): só o web-client
 * consome métricas hoje.
 */
export const metricsKeys = {
  owned: (establishmentId: string, sinceDays: number) =>
    ['panel', 'metrics', 'owned', establishmentId, sinceDays] as const,
  favoritesCount: (eventIds: string[]) =>
    ['panel', 'metrics', 'favorites-count', ...eventIds] as const,
};

/** Linhas cruas de métrica do bar do dono, no período pedido. */
export function useOwnedMetrics(sinceDays: number) {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: metricsKeys.owned(establishmentId ?? '', sinceDays),
    queryFn: () => listOwnedMetrics(establishmentId ?? '', { sinceDays }),
    enabled: Boolean(establishmentId),
  });
}

/** Contagem de favoritos por evento do bar do dono. */
export function useOwnedFavoritesCount() {
  const { data: events } = useOwnedEvents();
  const eventIds = (events ?? []).map((event) => event.id);

  return useQuery({
    queryKey: metricsKeys.favoritesCount(eventIds),
    queryFn: () => listOwnedFavoritesCount(eventIds),
    enabled: eventIds.length > 0,
  });
}

export interface EventMetricsSummary {
  eventId: string;
  views: number;
  clicksByKind: Record<MetricKind, number>;
  favorites: number;
}

export interface DayBucket {
  date: string;
  views: number;
  clicks: number;
}

/** Agrega linhas cruas em: totais por evento, série diária, totais do bar. */
export function aggregateMetrics(
  rows: MetricEvent[],
  favoritesByEvent: Record<string, number>,
): {
  byEvent: EventMetricsSummary[];
  byDay: DayBucket[];
  totals: { views: number; clicksByKind: Record<MetricKind, number>; favorites: number };
} {
  const byEventMap = new Map<string, EventMetricsSummary>();
  const byDayMap = new Map<string, DayBucket>();
  const totals = {
    views: 0,
    clicksByKind: { view: 0, click_map: 0, click_contact: 0, click_share: 0 } as Record<
      MetricKind,
      number
    >,
    favorites: 0,
  };

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    const dayBucket = byDayMap.get(day) ?? { date: day, views: 0, clicks: 0 };
    if (row.kind === 'view') {
      dayBucket.views += 1;
      totals.views += 1;
    } else {
      dayBucket.clicks += 1;
    }
    totals.clicksByKind[row.kind] += 1;
    byDayMap.set(day, dayBucket);

    if (row.eventId) {
      const eventSummary = byEventMap.get(row.eventId) ?? {
        eventId: row.eventId,
        views: 0,
        clicksByKind: { view: 0, click_map: 0, click_contact: 0, click_share: 0 },
        favorites: favoritesByEvent[row.eventId] ?? 0,
      };
      if (row.kind === 'view') {
        eventSummary.views += 1;
      }
      eventSummary.clicksByKind[row.kind] += 1;
      byEventMap.set(row.eventId, eventSummary);
    }
  }

  totals.favorites = Object.values(favoritesByEvent).reduce((sum, count) => sum + count, 0);

  return {
    byEvent: Array.from(byEventMap.values()).sort((a, b) => b.views - a.views),
    byDay: Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    totals,
  };
}
