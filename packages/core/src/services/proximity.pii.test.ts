import * as errors from '../utils/errors';
import { listNearbyEstablishments } from './proximity';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

beforeEach(() => {
  mockGetSupabase.mockReset();
});

describe('Regra de negócio: coordenada do usuário não vaza em mensagem nem em args', () => {
  it('coordenada inválida não expõe lat/lng na mensagem', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listNearbyEstablishments({ lat: 999, lng: -46.6 })).rejects.toThrow(
      /^Coordenada inválida$/,
    );
  });

  it('erro do RPC não loga lat/lng em args', async () => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: new Error('rpc falhou') }),
    });

    await expect(
      listNearbyEstablishments({ lat: -27.5954, lng: -48.548, radiusKm: 10, limit: 5 }),
    ).rejects.toThrow('rpc falhou');

    expect(spy).toHaveBeenCalledWith(expect.any(Error), {
      method: 'proximity.listNearbyEstablishments',
      args: { radiusKm: 10, limit: 5 },
    });
    const context = spy.mock.calls[0]?.[1];
    expect(context?.args).not.toHaveProperty('lat');
    expect(context?.args).not.toHaveProperty('lng');
    spy.mockRestore();
  });
});

describe('Tratamento de erro: contexto serializado sem coordenada exata', () => {
  it('args do erro do RPC não contém o valor da coordenada', async () => {
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });
    mockGetSupabase.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: new Error('rpc falhou') }),
    });

    await expect(listNearbyEstablishments({ lat: -27.5954, lng: -48.548 })).rejects.toThrow();

    const serialized = JSON.stringify(spy.mock.calls.map((call) => call[1]));
    expect(serialized).not.toContain('27.5954');
    expect(serialized).not.toContain('48.548');
    spy.mockRestore();
  });
});
