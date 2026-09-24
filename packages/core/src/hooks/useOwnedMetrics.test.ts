import type { MetricEvent } from '../services/metrics';
import { catalogKeys, panelKeys } from '../services/queryKeys';
import { aggregateMetrics } from './useOwnedMetrics';

describe('useOwnedMetrics / aggregateMetrics', () => {
  it('agrega views, clicks e favorites corretamente', () => {
    const rows: MetricEvent[] = [
      {
        establishmentId: 'est-1',
        eventId: 'event-1',
        kind: 'view',
        createdAt: '2026-09-10T12:00:00Z',
      },
      {
        establishmentId: 'est-1',
        eventId: 'event-1',
        kind: 'click_map',
        createdAt: '2026-09-10T14:00:00Z',
      },
      {
        establishmentId: 'est-1',
        eventId: 'event-2',
        kind: 'view',
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        establishmentId: 'est-1',
        eventId: 'event-2',
        kind: 'click_contact',
        createdAt: '2026-09-11T11:00:00Z',
      },
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
