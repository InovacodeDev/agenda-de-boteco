/**
 * proximity é um service com lógica → exige teste. Contrato travado:
 * `listNearbyEstablishments` tem comportamento IDÊNTICO nos dois caminhos
 * (RPC PostGIS e fallback mock): mesma forma (nearbyEstablishmentSchema),
 * ordenado por distance_km asc, respeitando raio e limite. O caminho RPC é
 * exercitado com um client fake; o fallback usa os mocks reais.
 */
import { ESTABLISHMENTS } from '../data';
import {
  listNearbyEstablishments,
  type NearbyEstablishment,
  nearbyEstablishmentSchema,
} from './proximity';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

// Centro de Floripa — origem conhecida para verificar monotonicidade.
const FLN = { lat: -27.5954, lng: -48.548 };

function isSorted(values: number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1] <= value);
}

beforeEach(() => {
  mockGetSupabase.mockReset();
});

describe('listNearbyEstablishments — fallback mock (sem client)', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(null);
  });

  it('retorna ordenado por distance_km ascendente', async () => {
    const result = await listNearbyEstablishments({ lat: FLN.lat, lng: FLN.lng });
    const distances = result.map((item) => item.distance_km);
    expect(distances.length).toBeGreaterThan(0);
    expect(isSorted(distances)).toBe(true);
  });

  it('cada item tem distance_km >= 0 e shape válido', async () => {
    const result = await listNearbyEstablishments({ lat: FLN.lat, lng: FLN.lng });
    for (const item of result) {
      expect(item.distance_km).toBeGreaterThanOrEqual(0);
      expect(() => nearbyEstablishmentSchema.parse(item)).not.toThrow();
    }
  });

  it('respeita radiusKm (exclui establishments além do raio)', async () => {
    const tight = await listNearbyEstablishments({
      lat: FLN.lat,
      lng: FLN.lng,
      radiusKm: 5,
    });
    for (const item of tight) {
      expect(item.distance_km).toBeLessThanOrEqual(5);
    }
    // Raio amplo cobre todos os establishments da mesma cidade (Floripa).
    const wide = await listNearbyEstablishments({
      lat: FLN.lat,
      lng: FLN.lng,
      radiusKm: 10_000,
    });
    expect(wide.length).toBe(ESTABLISHMENTS.length);
    expect(tight.length).toBeLessThanOrEqual(wide.length);
  });

  it('respeita limit', async () => {
    const limited = await listNearbyEstablishments({
      lat: FLN.lat,
      lng: FLN.lng,
      radiusKm: 10_000,
      limit: 3,
    });
    expect(limited.length).toBe(3);
    // Os 3 retornados são os mais próximos, em ordem.
    expect(isSorted(limited.map((item) => item.distance_km))).toBe(true);
  });
});

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

function makeRpcRow(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  const base = ESTABLISHMENTS[0];
  return {
    id: base.id,
    name: base.name,
    description: base.description,
    logo_url: base.logo_url,
    cover_url: base.cover_url,
    address: base.address,
    neighborhood: base.neighborhood,
    city_id: base.city_id,
    lat: base.lat,
    lng: base.lng,
    whatsapp: base.whatsapp,
    instagram: base.instagram ?? null,
    opening_hours: base.opening_hours,
    menu_items: base.menu_items,
    price_range: base.price_range,
    ambiance: base.ambiance,
    rating_avg: base.rating_avg,
    rating_count: base.rating_count,
    attributes: base.attributes,
    slug: base.slug ?? null,
    location: 'POINT(...)',
    distance_km: 1.23,
    ...overrides,
  };
}

function makeRpcClient(response: { data: unknown; error: unknown }) {
  const calls: RpcCall[] = [];
  const client = {
    rpc: jest.fn((name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return Promise.resolve(response);
    }),
  };
  return { client, calls };
}

describe('listNearbyEstablishments — caminho RPC (com client)', () => {
  it('chama nearby_establishments com args nomeados e defaults (50/50)', async () => {
    const { client, calls } = makeRpcClient({ data: [makeRpcRow()], error: null });
    mockGetSupabase.mockReturnValue(client);

    await listNearbyEstablishments({ lat: FLN.lat, lng: FLN.lng });

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('nearby_establishments');
    expect(calls[0].args).toEqual({
      origin_lat: FLN.lat,
      origin_lng: FLN.lng,
      radius_km: 50,
      max_results: 50,
    });
  });

  it('repassa radiusKm/limit explícitos para radius_km/max_results', async () => {
    const { client, calls } = makeRpcClient({ data: [makeRpcRow()], error: null });
    mockGetSupabase.mockReturnValue(client);

    await listNearbyEstablishments({
      lat: FLN.lat,
      lng: FLN.lng,
      radiusKm: 12,
      limit: 7,
    });

    expect(calls[0].args).toEqual({
      origin_lat: FLN.lat,
      origin_lng: FLN.lng,
      radius_km: 12,
      max_results: 7,
    });
  });

  it('mapeia instagram/slug null → undefined e omite location', async () => {
    const row = makeRpcRow({ instagram: null, slug: null });
    const { client } = makeRpcClient({ data: [row], error: null });
    mockGetSupabase.mockReturnValue(client);

    const result = await listNearbyEstablishments({ lat: FLN.lat, lng: FLN.lng });

    expect(result).toHaveLength(1);
    const item: NearbyEstablishment = result[0];
    expect(item.instagram).toBeUndefined();
    expect(item.slug).toBeUndefined();
    expect('location' in item).toBe(false);
    expect(item.distance_km).toBe(1.23);
    expect(() => nearbyEstablishmentSchema.parse(item)).not.toThrow();
  });

  it('propaga erro do RPC (rejeita)', async () => {
    const rpcError = new Error('rpc failed');
    const { client } = makeRpcClient({ data: null, error: rpcError });
    mockGetSupabase.mockReturnValue(client);

    await expect(
      listNearbyEstablishments({ lat: FLN.lat, lng: FLN.lng }),
    ).rejects.toBe(rpcError);
  });
});

describe('listNearbyEstablishments — coordenadas inválidas', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(null);
  });

  it('rejeita lat NaN', async () => {
    await expect(
      listNearbyEstablishments({ lat: Number.NaN, lng: FLN.lng }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('rejeita lng fora do intervalo [-180, 180]', async () => {
    await expect(
      listNearbyEstablishments({ lat: FLN.lat, lng: 200 }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('rejeita lat fora do intervalo [-90, 90]', async () => {
    await expect(
      listNearbyEstablishments({ lat: 95, lng: FLN.lng }),
    ).rejects.toThrow(/coordenada/i);
  });

  it('aceita coordenadas válidas nos limites', async () => {
    await expect(
      listNearbyEstablishments({ lat: -90, lng: 180, radiusKm: 1 }),
    ).resolves.toBeInstanceOf(Array);
  });
});
