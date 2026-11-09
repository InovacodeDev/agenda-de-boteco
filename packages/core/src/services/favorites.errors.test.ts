import * as errors from '../utils/errors';
import {
  addServerFavorite,
  addServerFavorites,
  type FavoriteTarget,
  fetchServerFavorites,
  removeServerFavorite,
} from './favorites';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

const USER_ID = 'user-secret-id';
const TARGET: FavoriteTarget = { type: 'event', id: 'target-secret-id' };
const postgrest42501 = {
  message: 'new row violates row-level security policy',
  details: '',
  hint: '',
  code: '42501',
};

type Call = [string, () => Promise<unknown>];

const CASES: Call[] = [
  ['favorites.fetchServerFavorites', () => fetchServerFavorites()],
  ['favorites.addServerFavorite', () => addServerFavorite(USER_ID, TARGET)],
  ['favorites.addServerFavorites', () => addServerFavorites(USER_ID, [TARGET, TARGET])],
  ['favorites.removeServerFavorite', () => removeServerFavorite(USER_ID, TARGET)],
];

function makeFailingClient(error: unknown) {
  const result = Promise.resolve({ data: null, error });
  const chain = {
    select: jest.fn(() => result),
    upsert: jest.fn(() => result),
    delete: jest.fn(() => ({ eq: () => ({ eq: () => ({ eq: () => result }) }) })),
  };
  return { from: jest.fn(() => chain) };
}

let handleSpy: jest.SpyInstance;

beforeEach(() => {
  mockGetSupabase.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  handleSpy = jest.spyOn(errors, 'handleServiceError');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Regra de negócio: services de favoritos passam por handleServiceError', () => {
  it.each(CASES)('%s rejeita com o mesmo erro e reporta com o method esperado', async (method, run) => {
    mockGetSupabase.mockReturnValue(makeFailingClient(postgrest42501));

    await expect(run()).rejects.toBe(postgrest42501);

    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(handleSpy).toHaveBeenCalledWith(postgrest42501, expect.objectContaining({ method }));
  });

  it.each(CASES)('%s não põe userId nem target.id em args', async (_method, run) => {
    mockGetSupabase.mockReturnValue(makeFailingClient(postgrest42501));

    await expect(run()).rejects.toBe(postgrest42501);

    const serialized = JSON.stringify(handleSpy.mock.calls[0]?.[1]);
    expect(serialized).not.toContain(USER_ID);
    expect(serialized).not.toContain(TARGET.id);
  });

  it('addServerFavorite usa só target.type e addServerFavorites só a contagem em args', async () => {
    mockGetSupabase.mockReturnValue(makeFailingClient(postgrest42501));

    await expect(addServerFavorite(USER_ID, TARGET)).rejects.toBe(postgrest42501);
    await expect(addServerFavorites(USER_ID, [TARGET, TARGET])).rejects.toBe(postgrest42501);

    expect(handleSpy.mock.calls[0]?.[1]).toEqual({
      method: 'favorites.addServerFavorite',
      args: { targetType: 'event' },
    });
    expect(handleSpy.mock.calls[1]?.[1]).toEqual({
      method: 'favorites.addServerFavorites',
      args: { count: 2 },
    });
  });
});

describe('Tratamento de erro: favoritos sem client ou com resposta inválida', () => {
  it.each(CASES)('%s com client ausente não reporta nada', async (_method, run) => {
    mockGetSupabase.mockReturnValue(null);

    await run();

    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('addServerFavorites com lista vazia não chama o servidor nem reporta', async () => {
    const client = makeFailingClient(postgrest42501);
    mockGetSupabase.mockReturnValue(client);

    await expect(addServerFavorites(USER_ID, [])).resolves.toBeUndefined();

    expect(client.from).not.toHaveBeenCalled();
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('fetchServerFavorites com linha fora do schema rejeita e reporta o ZodError', async () => {
    const rows = [{ target_type: 'banana', target_id: 'x' }];
    const client = {
      from: jest.fn(() => ({ select: () => Promise.resolve({ data: rows, error: null }) })),
    };
    mockGetSupabase.mockReturnValue(client);

    await expect(fetchServerFavorites()).rejects.toMatchObject({ name: 'ZodError' });

    expect(handleSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ZodError' }),
      { method: 'favorites.fetchServerFavorites' },
    );
  });
});
