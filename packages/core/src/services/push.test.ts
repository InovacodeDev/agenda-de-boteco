import * as errors from '../utils/errors';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  registerPushToken,
  saveNotificationPreferences,
  unregisterPushToken,
} from './push';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

const SESSION = { data: { session: { user: { id: 'u1' } } } };
const NO_SESSION = { data: { session: null } };
const POSTGREST_ERROR = { message: 'boom', code: '42501', details: '', hint: '' };

function makeClient(
  options: {
    session?: unknown;
    result?: { data: unknown; error: unknown };
    rpcResult?: { data: unknown; error: unknown };
  } = {},
) {
  const result = options.result ?? { data: null, error: null };
  const rpcResult = options.rpcResult ?? { data: null, error: null };
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const selectEq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq: selectEq });
  const upsert = jest.fn().mockResolvedValue(result);
  const deleteEq = jest.fn().mockResolvedValue(result);
  const del = jest.fn().mockReturnValue({ eq: deleteEq });
  const from = jest.fn().mockReturnValue({ select, upsert, delete: del });
  const rpc = jest.fn().mockResolvedValue(rpcResult);
  return {
    auth: { getSession: jest.fn().mockResolvedValue(options.session ?? SESSION) },
    from,
    rpc,
    select,
    selectEq,
    upsert,
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

describe('registerPushToken', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(registerPushToken({ token: 't', platform: 'ios' })).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('lança sem sessão e não grava', async () => {
    const client = makeClient({ session: NO_SESSION });
    mockGetSupabase.mockReturnValue(client);
    await expect(registerPushToken({ token: 't', platform: 'ios' })).rejects.toThrow(
      'Usuário não autenticado',
    );
    expect(client.upsert).not.toHaveBeenCalled();
  });

  it('rejeita plataforma fora da allowlist', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await expect(
      registerPushToken({ token: 't', platform: 'web' as 'ios' }),
    ).rejects.toBeDefined();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('chama a RPC register_push_token sem enviar user_id', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await registerPushToken({ token: 'ExponentPushToken[x]', platform: 'android' });
    expect(client.rpc).toHaveBeenCalledWith('register_push_token', {
      p_token: 'ExponentPushToken[x]',
      p_platform: 'android',
    });
  });

  it('re-lança erro do Postgrest sem token nos args do log', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({ rpcResult: { data: null, error: POSTGREST_ERROR } }),
    );
    await expect(registerPushToken({ token: 'secret', platform: 'ios' })).rejects.toBeDefined();
    expect(serviceErrorSpy).toHaveBeenCalledWith(POSTGREST_ERROR, {
      method: 'push.registerPushToken',
    });
  });
});

describe('unregisterPushToken', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(unregisterPushToken('t')).rejects.toThrow('Supabase não configurado');
  });

  it('lança sem sessão', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ session: NO_SESSION }));
    await expect(unregisterPushToken('t')).rejects.toThrow('Usuário não autenticado');
  });

  it('remove pelo token', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await unregisterPushToken('t');
    expect(client.deleteEq).toHaveBeenCalledWith('token', 't');
  });

  it('re-lança erro do Postgrest', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ result: { data: null, error: POSTGREST_ERROR } }));
    await expect(unregisterPushToken('t')).rejects.toBeDefined();
  });
});

describe('getNotificationPreferences', () => {
  it('retorna defaults sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(getNotificationPreferences()).resolves.toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('retorna defaults sem sessão', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ session: NO_SESSION }));
    await expect(getNotificationPreferences()).resolves.toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('retorna defaults sem linha salva', async () => {
    mockGetSupabase.mockReturnValue(makeClient());
    await expect(getNotificationPreferences()).resolves.toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('mapeia a linha do banco para camelCase', async () => {
    const client = makeClient({
      result: {
        data: {
          channel_email: false,
          channel_push: true,
          alert_reviews: false,
          alert_musicians: true,
          alert_event_status: false,
          alert_empty_schedule: true,
          alert_weekly_digest: true,
        },
        error: null,
      },
    });
    mockGetSupabase.mockReturnValue(client);
    await expect(getNotificationPreferences()).resolves.toEqual({
      channelEmail: false,
      channelPush: true,
      alertReviews: false,
      alertMusicians: true,
      alertEventStatus: false,
      alertEmptySchedule: true,
      alertWeeklyDigest: true,
    });
    expect(client.selectEq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('re-lança erro do Postgrest', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ result: { data: null, error: POSTGREST_ERROR } }));
    await expect(getNotificationPreferences()).rejects.toBeDefined();
  });
});

describe('saveNotificationPreferences', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('lança sem sessão', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ session: NO_SESSION }));
    await expect(saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)).rejects.toThrow(
      'Usuário não autenticado',
    );
  });

  it('faz upsert por user_id da sessão', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    await saveNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, channelPush: false });
    expect(client.from).toHaveBeenCalledWith('notification_preferences');
    expect(client.upsert).toHaveBeenCalledWith(
      {
        user_id: 'u1',
        channel_email: true,
        channel_push: false,
        alert_reviews: true,
        alert_musicians: true,
        alert_event_status: true,
        alert_empty_schedule: true,
        alert_weekly_digest: false,
      },
      { onConflict: 'user_id' },
    );
  });

  it('re-lança erro do Postgrest', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ result: { data: null, error: POSTGREST_ERROR } }));
    await expect(saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)).rejects.toBeDefined();
  });
});
