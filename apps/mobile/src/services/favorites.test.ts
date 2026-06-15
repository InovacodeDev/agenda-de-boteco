import {
  addServerFavorite,
  type FavoriteTarget,
  fetchServerFavorites,
  removeServerFavorite,
} from './favorites';

const mockGetSupabase = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));

beforeEach(() => {
  mockGetSupabase.mockReset();
});

describe('fetchServerFavorites', () => {
  it('retorna lista vazia quando não há client (deslogado/sem config)', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(fetchServerFavorites()).resolves.toEqual([]);
  });

  it('mapeia linhas do servidor para FavoriteTarget', async () => {
    const rows = [
      { target_type: 'event', target_id: 'ev1' },
      { target_type: 'establishment', target_id: 'es1' },
    ];
    const client = {
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: rows, error: null })),
      })),
    };
    mockGetSupabase.mockReturnValue(client);

    const result = await fetchServerFavorites();
    expect(result).toEqual<FavoriteTarget[]>([
      { type: 'event', id: 'ev1' },
      { type: 'establishment', id: 'es1' },
    ]);
    expect(client.from).toHaveBeenCalledWith('user_favorites');
  });

  it('propaga erro do select', async () => {
    const error = new Error('select failed');
    const client = {
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: null, error })),
      })),
    };
    mockGetSupabase.mockReturnValue(client);
    await expect(fetchServerFavorites()).rejects.toBe(error);
  });
});

describe('addServerFavorite / removeServerFavorite', () => {
  it('addServerFavorite é no-op sem client', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      addServerFavorite('userX', { type: 'event', id: 'ev1' }),
    ).resolves.toBeUndefined();
  });

  it('addServerFavorite faz upsert com user_id e alvo', async () => {
    const upsert = jest.fn(() => Promise.resolve({ error: null }));
    const client = { from: jest.fn(() => ({ upsert })) };
    mockGetSupabase.mockReturnValue(client);

    await addServerFavorite('userX', { type: 'event', id: 'ev1' });
    expect(client.from).toHaveBeenCalledWith('user_favorites');
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'userX', target_type: 'event', target_id: 'ev1' },
      { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true },
    );
  });

  it('removeServerFavorite filtra por user_id/type/id', async () => {
    const eqId = jest.fn(() => Promise.resolve({ error: null }));
    const eqType = jest.fn(() => ({ eq: eqId }));
    const eqUser = jest.fn(() => ({ eq: eqType }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const client = { from: jest.fn(() => ({ delete: del })) };
    mockGetSupabase.mockReturnValue(client);

    await removeServerFavorite('userX', { type: 'establishment', id: 'es1' });
    expect(eqUser).toHaveBeenCalledWith('user_id', 'userX');
    expect(eqType).toHaveBeenCalledWith('target_type', 'establishment');
    expect(eqId).toHaveBeenCalledWith('target_id', 'es1');
  });

  it('addServerFavorite propaga erro do upsert', async () => {
    const error = new Error('upsert failed');
    const client = { from: jest.fn(() => ({ upsert: jest.fn(() => Promise.resolve({ error })) })) };
    mockGetSupabase.mockReturnValue(client);
    await expect(
      addServerFavorite('userX', { type: 'event', id: 'ev1' }),
    ).rejects.toBe(error);
  });
});
