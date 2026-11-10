import * as errors from '../utils/errors';
import { getOwnedFavoritesCountByEstablishment, listOwnedMetrics } from './metrics';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const postgrest42501 = {
  message: 'permission denied',
  details: '',
  hint: '',
  code: '42501',
};

let handleSpy: jest.SpyInstance;

beforeEach(() => {
  mockGetSupabase.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  handleSpy = jest.spyOn(errors, 'handleServiceError');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Regra de negócio: métricas do dono reportam falha da RPC', () => {
  it('listOwnedMetrics rejeita com o mesmo erro e reporta o method com ids opacos', async () => {
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: postgrest42501 }),
    });

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).rejects.toBe(postgrest42501);

    expect(handleSpy).toHaveBeenCalledWith(postgrest42501, {
      method: 'metrics.listOwnedMetrics',
      args: { establishmentId: 'es1', sinceDays: 30 },
    });
  });

  it('getOwnedFavoritesCountByEstablishment rejeita com o mesmo erro e reporta o method', async () => {
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: postgrest42501 }),
    });

    await expect(getOwnedFavoritesCountByEstablishment('es1')).rejects.toBe(postgrest42501);

    expect(handleSpy).toHaveBeenCalledWith(postgrest42501, {
      method: 'metrics.getOwnedFavoritesCountByEstablishment',
      args: { establishmentId: 'es1' },
    });
  });
});

describe('Tratamento de erro: validação e resposta inválida em métricas', () => {
  it('período inválido rejeita sem reportar (erro de uso, não do servidor)', async () => {
    mockGetSupabase.mockReturnValue({ rpc: jest.fn() });

    await expect(listOwnedMetrics('es1', { sinceDays: 0 })).rejects.toThrow(
      'Período de métricas inválido',
    );
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('linha fora do schema rejeita ZodError e reporta', async () => {
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: [{ day: 1 }], error: null }),
    });

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).rejects.toMatchObject({
      name: 'ZodError',
    });
    expect(handleSpy).toHaveBeenCalledTimes(1);
  });

  it('client ausente devolve vazio sem reportar', async () => {
    mockGetSupabase.mockReturnValue(null);

    await expect(listOwnedMetrics('es1', { sinceDays: 30 })).resolves.toEqual([]);
    await expect(getOwnedFavoritesCountByEstablishment('es1')).resolves.toEqual({});
    expect(handleSpy).not.toHaveBeenCalled();
  });
});
