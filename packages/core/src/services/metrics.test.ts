import { getOwnedFavoritesCountByEstablishment, listOwnedMetrics, recordMetricEvent } from './metrics';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const mockLogErrorToTerminal = jest.fn();
jest.mock('../utils/errors', () => {
  const actual = jest.requireActual('../utils/errors');
  return {
    ...actual,
    logErrorToTerminal: (...args: unknown[]) => mockLogErrorToTerminal(...args),
  };
});

beforeEach(() => {
  mockGetSupabase.mockReset();
  mockLogErrorToTerminal.mockReset();
});

describe('recordMetricEvent', () => {
  it('é no-op sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      recordMetricEvent({ establishmentId: 'es1', kind: 'view' }),
    ).resolves.toBeUndefined();
  });

  it('chama a RPC record_metric_event com os parâmetros certos', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ rpc });

    await recordMetricEvent({ establishmentId: 'es1', eventId: 'ev1', kind: 'click_map' });

    expect(rpc).toHaveBeenCalledWith('record_metric_event', {
      p_establishment_id: 'es1',
      p_event_id: 'ev1',
      p_kind: 'click_map',
    });
  });

  it('omite p_event_id como null quando eventId não é passado', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ rpc });

    await recordMetricEvent({ establishmentId: 'es1', kind: 'view' });

    expect(rpc).toHaveBeenCalledWith('record_metric_event', {
      p_establishment_id: 'es1',
      p_event_id: null,
      p_kind: 'view',
    });
  });

  it('nunca lança quando a RPC falha — apenas loga', async () => {
    const rpc = jest.fn().mockResolvedValue({ error: new Error('boom') });
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(
      recordMetricEvent({ establishmentId: 'es1', kind: 'view' }),
    ).resolves.toBeUndefined();
    expect(mockLogErrorToTerminal).toHaveBeenCalled();
  });
});

describe('listOwnedMetrics', () => {
  it('retorna [] sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).resolves.toEqual([]);
  });

  it('chama a RPC agregada e mapeia as linhas (total bigint vem como string)', async () => {
    const rows = [
      { day: '2026-08-01', event_id: 'ev1', kind: 'view', total: '1500' },
      { day: '2026-08-02', event_id: null, kind: 'click_map', total: 3 },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    mockGetSupabase.mockReturnValue({ rpc });

    const result = await listOwnedMetrics('es1', { sinceDays: 30 });

    expect(rpc).toHaveBeenCalledWith('get_owned_metrics_aggregate', {
      p_establishment_id: 'es1',
      p_since_days: 30,
    });
    expect(result).toEqual([
      { day: '2026-08-01', eventId: 'ev1', kind: 'view', total: 1500 },
      { day: '2026-08-02', eventId: null, kind: 'click_map', total: 3 },
    ]);
  });

  it('propaga erro da RPC', async () => {
    const error = new Error('rpc failed');
    const rpc = jest.fn().mockResolvedValue({ data: null, error });
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).rejects.toBe(error);
  });

  it.each([0, -1, 366, 1.5, Number.NaN])('rejeita período inválido %p sem chamar a RPC', async (sinceDays) => {
    const rpc = jest.fn();
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(listOwnedMetrics('es1', { sinceDays })).rejects.toThrow('Período de métricas inválido');
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('getOwnedFavoritesCountByEstablishment', () => {
  it('retorna {} sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(getOwnedFavoritesCountByEstablishment('es1')).resolves.toEqual({});
  });

  it('chama get_owned_favorites_count e mapeia event_id -> contagem', async () => {
    const rows = [
      { event_id: 'ev1', favorites_count: 2 },
      { event_id: 'ev2', favorites_count: 1 },
    ];
    const rpc = jest.fn().mockResolvedValue({ data: rows, error: null });
    const client = { rpc };
    mockGetSupabase.mockReturnValue(client);

    const result = await getOwnedFavoritesCountByEstablishment('es1');

    expect(rpc).toHaveBeenCalledWith('get_owned_favorites_count', {
      p_establishment_id: 'es1',
    });
    expect(result).toEqual({ ev1: 2, ev2: 1 });
  });

  it('propaga o erro 42501 quando a RPC rejeita por falta de posse', async () => {
    const error = { message: 'Não autorizado', code: '42501', details: '', hint: '' };
    const rpc = jest.fn().mockResolvedValue({ data: null, error });
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(getOwnedFavoritesCountByEstablishment('es1')).rejects.toBe(error);
  });
});
