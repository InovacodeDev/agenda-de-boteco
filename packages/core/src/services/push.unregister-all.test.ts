import * as errors from '../utils/errors';
import { unregisterAllPushTokens } from './push';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

const SESSION = { data: { session: { user: { id: 'u1' } } } };
const NO_SESSION = { data: { session: null } };
const POSTGREST_ERROR = { message: 'boom', code: '42501', details: '', hint: '' };

function makeClient(options: { session?: unknown; error?: unknown } = {}) {
  const deleteEq = jest.fn().mockResolvedValue({ data: null, error: options.error ?? null });
  const del = jest.fn().mockReturnValue({ eq: deleteEq });
  const from = jest.fn().mockReturnValue({ delete: del });
  return {
    auth: { getSession: jest.fn().mockResolvedValue(options.session ?? SESSION) },
    from,
    del,
    deleteEq,
  };
}

let serviceErrorSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  serviceErrorSpy = jest.spyOn(errors, 'handleServiceError');
});

afterEach(() => {
  serviceErrorSpy.mockRestore();
});

describe('Regra de negócio: unregisterAllPushTokens', () => {
  it('apaga os tokens filtrando apenas pelo user_id da sessão', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await unregisterAllPushTokens();
    expect(client.from).toHaveBeenCalledWith('push_tokens');
    expect(client.deleteEq).toHaveBeenCalledTimes(1);
    expect(client.deleteEq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('sem sessão não apaga nada e não lança', async () => {
    const client = makeClient({ session: NO_SESSION });
    mockGetSupabase.mockReturnValue(client);
    await expect(unregisterAllPushTokens()).resolves.toBeUndefined();
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('Tratamento de erro: unregisterAllPushTokens', () => {
  it('lança quando o client Supabase está ausente', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(unregisterAllPushTokens()).rejects.toThrow('Supabase não configurado');
    expect(serviceErrorSpy).toHaveBeenCalledWith(expect.any(Error), {
      method: 'push.unregisterAllPushTokens',
    });
  });

  it('relança o erro do Postgrest via handleServiceError sem PII em args', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ error: POSTGREST_ERROR }));
    await expect(unregisterAllPushTokens()).rejects.toBeDefined();
    expect(serviceErrorSpy).toHaveBeenCalledWith(POSTGREST_ERROR, {
      method: 'push.unregisterAllPushTokens',
    });
  });
});
