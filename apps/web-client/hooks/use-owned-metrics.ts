'use client';

import {
  getOwnedFavoritesCountByEstablishment,
  listOwnedMetrics,
  type MetricAggregate,
  type MetricKind,
} from '@agenda/core';
import { useQuery } from '@tanstack/react-query';

import { useOwnedEstablishmentId } from './use-owned-establishment';

/**
 * Query keys do painel. Fica local (Regra dos 3 do AGENTS.md): só o web-client
 * consome métricas hoje.
 */
export const metricsKeys = {
  owned: (establishmentId: string, sinceDays: number) =>
    ['panel', 'metrics', 'owned', establishmentId, sinceDays] as const,
  favoritesCount: (establishmentId: string) =>
    ['panel', 'metrics', 'favorites-count', establishmentId] as const,
};

/** Contagens agregadas no banco (dia, tipo, evento) do bar do dono, no período pedido. */
export function useOwnedMetrics(sinceDays: number) {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: metricsKeys.owned(establishmentId ?? '', sinceDays),
    queryFn: () => listOwnedMetrics(establishmentId ?? '', { sinceDays }),
    enabled: Boolean(establishmentId),
  });
}

/**
 * Contagem de favoritos por evento do bar do dono — cobre TODOS os eventos via
 * RPC agregada no banco (get_owned_favorites_count), não só os já paginados
 * por useOwnedEvents.
 */
export function useOwnedFavoritesCount() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: metricsKeys.favoritesCount(establishmentId ?? ''),
    queryFn: () => getOwnedFavoritesCountByEstablishment(establishmentId ?? ''),
    enabled: Boolean(establishmentId),
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

const ZERO_CLICKS_BY_KIND: Record<MetricKind, number> = {
  view: 0,
  click_map: 0,
  click_contact: 0,
  click_share: 0,
};

/** Soma as contagens agregadas em: totais por evento, série diária, totais do bar. */
export function aggregateMetrics(
  rows: MetricAggregate[],
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
    clicksByKind: { ...ZERO_CLICKS_BY_KIND },
    favorites: 0,
  };

  for (const row of rows) {
    const day = row.day;
    const dayBucket = byDayMap.get(day) ?? { date: day, views: 0, clicks: 0 };
    if (row.kind === 'view') {
      dayBucket.views += row.total;
      totals.views += row.total;
    } else {
      dayBucket.clicks += row.total;
    }
    totals.clicksByKind[row.kind] += row.total;
    byDayMap.set(day, dayBucket);

    if (row.eventId) {
      const eventSummary = byEventMap.get(row.eventId) ?? {
        eventId: row.eventId,
        views: 0,
        clicksByKind: { ...ZERO_CLICKS_BY_KIND },
        favorites: favoritesByEvent[row.eventId] ?? 0,
      };
      if (row.kind === 'view') {
        eventSummary.views += row.total;
      }
      eventSummary.clicksByKind[row.kind] += row.total;
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
