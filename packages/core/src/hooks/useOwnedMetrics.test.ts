import type { MetricAggregate } from '../services/metrics';
import { catalogKeys, panelKeys } from '../services/queryKeys';
import { aggregateMetrics } from './useOwnedMetrics';

describe('useOwnedMetrics / aggregateMetrics', () => {
  it('agrega views, clicks e favorites corretamente', () => {
    const rows: MetricAggregate[] = [
      { day: '2026-09-10', eventId: 'event-1', kind: 'view', total: 1 },
      { day: '2026-09-10', eventId: 'event-1', kind: 'click_map', total: 1 },
      { day: '2026-09-11', eventId: 'event-2', kind: 'view', total: 1 },
      { day: '2026-09-11', eventId: 'event-2', kind: 'click_contact', total: 1 },
    ];

    const favorites = {
      'event-1': 5,
      'event-2': 3,
    };

    const { byEvent, byDay, totals } = aggregateMetrics(rows, favorites);

    expect(totals.views).toBe(2);
    expect(totals.clicksByKind.click_map).toBe(1);
    expect(totals.clicksByKind.click_contact).toBe(1);
    expect(totals.favorites).toBe(8);

    expect(byEvent.length).toBe(2);
    expect(byDay.length).toBe(2);
    expect(byDay[0]?.date).toBe('2026-09-10');
    expect(byDay[0]?.views).toBe(1);
    expect(byDay[0]?.clicks).toBe(1);
  });

  it('soma o total de cada linha agregada', () => {
    const rows: MetricAggregate[] = [
      { day: '2026-09-10', eventId: 'event-1', kind: 'view', total: 7 },
      { day: '2026-09-10', eventId: 'event-1', kind: 'click_share', total: 3 },
      { day: '2026-09-10', eventId: null, kind: 'view', total: 2 },
    ];

    const { byEvent, byDay, totals } = aggregateMetrics(rows, {});

    expect(totals.views).toBe(9);
    expect(totals.clicksByKind.click_share).toBe(3);
    expect(byDay).toEqual([{ date: '2026-09-10', views: 9, clicks: 3 }]);
    expect(byEvent[0]?.views).toBe(7);
  });

  it('lida com lista vazia de métricas', () => {
    const { byEvent, byDay, totals } = aggregateMetrics([], {});
    expect(totals.views).toBe(0);
    expect(totals.favorites).toBe(0);
    expect(byEvent).toEqual([]);
    expect(byDay).toEqual([]);
  });

  it('valida estrutura das query keys de painel', () => {
    expect(catalogKeys.panel.ownedEstablishmentId).toEqual(['panel', 'owned-establishment-id']);
    expect(panelKeys.ownedEstablishmentId).toEqual(['panel', 'owned-establishment-id']);
    expect(catalogKeys.panel.metrics('est-1', 30)).toEqual(['panel', 'metrics', 'owned', 'est-1', 30]);
    expect(catalogKeys.panel.favoritesCount('est-1')).toEqual(['panel', 'metrics', 'favorites-count', 'est-1']);
  });
});
