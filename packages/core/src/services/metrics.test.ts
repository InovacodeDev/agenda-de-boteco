import { listOwnedFavoritesCount, listOwnedMetrics, recordMetricEvent } from './metrics';

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

  it('busca linhas do período via gte(created_at) e valida com zod', async () => {
    const rows = [
      { establishment_id: 'es1', event_id: 'ev1', kind: 'view', created_at: '2026-08-01T00:00:00Z' },
      { establishment_id: 'es1', event_id: null, kind: 'click_map', created_at: '2026-08-02T00:00:00Z' },
    ];
    const gte = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    const result = await listOwnedMetrics('es1', { sinceDays: 30 });

    expect(client.from).toHaveBeenCalledWith('establishment_metrics');
    expect(eq).toHaveBeenCalledWith('establishment_id', 'es1');
    expect(result).toEqual([
      { establishmentId: 'es1', eventId: 'ev1', kind: 'view', createdAt: '2026-08-01T00:00:00Z' },
      { establishmentId: 'es1', eventId: null, kind: 'click_map', createdAt: '2026-08-02T00:00:00Z' },
    ]);
  });

  it('propaga erro do select', async () => {
    const error = new Error('select failed');
    const gte = jest.fn().mockResolvedValue({ data: null, error });
    const eq = jest.fn().mockReturnValue({ gte });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).rejects.toBe(error);
  });
});

describe('listOwnedFavoritesCount', () => {
  it('retorna {} sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listOwnedFavoritesCount(['ev1', 'ev2'])).resolves.toEqual({});
  });

  it('retorna {} sem eventIds', async () => {
    mockGetSupabase.mockReturnValue({});
    await expect(listOwnedFavoritesCount([])).resolves.toEqual({});
  });

  it('conta favoritos por event_id a partir de user_favorites', async () => {
    const rows = [
      { target_id: 'ev1' },
      { target_id: 'ev1' },
      { target_id: 'ev2' },
    ];
    const inFn = jest.fn().mockResolvedValue({ data: rows, error: null });
    const eq = jest.fn().mockReturnValue({ in: inFn });
    const select = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ select }) };
    mockGetSupabase.mockReturnValue(client);

    const result = await listOwnedFavoritesCount(['ev1', 'ev2']);

    expect(client.from).toHaveBeenCalledWith('user_favorites');
    expect(eq).toHaveBeenCalledWith('target_type', 'event');
    expect(inFn).toHaveBeenCalledWith('target_id', ['ev1', 'ev2']);
    expect(result).toEqual({ ev1: 2, ev2: 1 });
  });
});
