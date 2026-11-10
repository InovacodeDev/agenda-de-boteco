import { ESTABLISHMENTS } from '../data';
import { reportException } from './analytics';
import { listNearbyEstablishments } from './proximity';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));
jest.mock('./analytics', () => ({ reportException: jest.fn() }));

const mockReport = reportException as jest.Mock;

const FLN = { lat: -27.5954, lng: -48.548 };

function nearbyRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...ESTABLISHMENTS[0],
    id,
    logo_url: null,
    cover_url: null,
    instagram: null,
    slug: null,
    distance_km: 1,
    ...overrides,
  };
}

function clientWith(data: unknown) {
  return { rpc: jest.fn().mockResolvedValue({ data, error: null }) };
}

beforeEach(() => {
  mockReport.mockReset();
  mockGetSupabase.mockReset();
});

describe('Regra de negócio: bares próximos descartam só a linha inválida', () => {
  it('1 linha inválida em 3 devolve 2 itens, sem lançar', async () => {
    const rows = [nearbyRow('a'), nearbyRow('b', { distance_km: -1 }), nearbyRow('c')];
    mockGetSupabase.mockReturnValue(clientWith(rows));

    const items = await listNearbyEstablishments(FLN);

    expect(items.map((item) => item.id)).toEqual(['a', 'c']);
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(expect.any(Error), {
      fingerprint: ['zod-schema-drift', 'nearby_establishments', 'distance_km'],
      recordId: ESTABLISHMENTS[0]?.external_id,
    });
  });

  it('menu_items inválido gera fingerprint com menu_items.*.campo', async () => {
    const rows = [nearbyRow('a', { menu_items: [{ name: 'x', price: 'caro' }] })];
    mockGetSupabase.mockReturnValue(clientWith(rows));

    await expect(listNearbyEstablishments(FLN)).resolves.toEqual([]);

    expect(mockReport.mock.calls[0]?.[1].fingerprint).toEqual([
      'zod-schema-drift',
      'nearby_establishments',
      'menu_items.*.price',
    ]);
  });
});

describe('Tratamento de erro: erro que não é ZodError propaga', () => {
  it('resposta fora do formato de lista rejeita com TypeError sem reportar drift', async () => {
    mockGetSupabase.mockReturnValue(clientWith({}));

    await expect(listNearbyEstablishments(FLN)).rejects.toThrow(TypeError);

    const driftCalls = mockReport.mock.calls.filter((call) => call[1]?.fingerprint !== undefined);
    expect(driftCalls).toEqual([]);
  });
});
