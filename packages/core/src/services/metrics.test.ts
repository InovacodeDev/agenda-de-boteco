import { recordMetricEvent } from './metrics';

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
