/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';

import { useRecordView } from './useRecordView';

const mockRecordMetricEvent = jest.fn();
jest.mock('../services/metrics', () => ({
  recordMetricEvent: (...args: unknown[]) => mockRecordMetricEvent(...args),
}));

beforeEach(() => {
  mockRecordMetricEvent.mockReset();
});

describe('useRecordView', () => {
  it('registra uma view na montagem', () => {
    renderHook(() => useRecordView({ establishmentId: 'es-mount', eventId: 'ev-mount' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledWith({
      establishmentId: 'es-mount',
      eventId: 'ev-mount',
      kind: 'view',
    });
  });

  it('não registra sem establishmentId', () => {
    renderHook(() => useRecordView({ establishmentId: undefined, eventId: 'ev-none' }));
    expect(mockRecordMetricEvent).not.toHaveBeenCalled();
  });

  // ponytail: lastViewedAt é Map em escopo de módulo — persiste entre os `it()`
  // deste arquivo. Cada teste usa establishmentId/eventId únicos para não
  // herdar estado de debounce de um teste anterior.
  it('não duplica a view na mesma chave dentro da janela de debounce', () => {
    const { unmount } = renderHook(() =>
      useRecordView({ establishmentId: 'es-dedupe', eventId: 'ev-dedupe' }),
    );
    unmount();
    renderHook(() => useRecordView({ establishmentId: 'es-dedupe', eventId: 'ev-dedupe' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledTimes(1);
  });

  it('registra de novo para uma chave diferente', () => {
    renderHook(() => useRecordView({ establishmentId: 'es-diff', eventId: 'ev-diff-1' }));
    renderHook(() => useRecordView({ establishmentId: 'es-diff', eventId: 'ev-diff-2' }));
    expect(mockRecordMetricEvent).toHaveBeenCalledTimes(2);
  });
});
