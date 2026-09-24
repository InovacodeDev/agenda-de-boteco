import { useQuery } from '@tanstack/react-query';

import {
  getOwnedFavoritesCountByEstablishment,
  listOwnedMetrics,
  type MetricEvent,
  type MetricKind,
} from '../services/metrics';
import { catalogKeys } from '../services/queryKeys';
import { useOwnedEstablishmentId } from './useOwnedEstablishment';

export function useOwnedMetrics(sinceDays: number) {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: catalogKeys.panel.metrics(establishmentId ?? '', sinceDays),
    queryFn: () => listOwnedMetrics(establishmentId ?? '', { sinceDays }),
    enabled: Boolean(establishmentId),
  });
}

export function useOwnedFavoritesCount() {
  const { data: establishmentId } = useOwnedEstablishmentId();

  return useQuery({
    queryKey: catalogKeys.panel.favoritesCount(establishmentId ?? ''),
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
    clicksByKind: { ...ZERO_CLICKS_BY_KIND },
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
        clicksByKind: { ...ZERO_CLICKS_BY_KIND },
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
