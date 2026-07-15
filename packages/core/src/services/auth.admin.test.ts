/**
 * Contrato de isCurrentUserAdmin:
 * - Sem client configurado -> false (não lança).
 * - Sem sessão -> false.
 * - Com sessão e profiles.is_admin true/false -> reflete o valor.
 * - is_admin ausente/null -> false (nunca admin por omissão).
 */
const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

import { isCurrentUserAdmin } from './auth';

function createClient(opts: {
  userId?: string | null;
  profile?: { is_admin: boolean | null } | null;
  profileError?: { message: string; details: string; hint: string; code: string } | null;
}) {
  return {
    auth: {
      getSession: async () => ({
        data: { session: opts.userId ? { user: { id: opts.userId } } : null },
        error: null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: opts.profile ?? null,
            error: opts.profileError ?? null,
          }),
        }),
      }),
    }),
  };
}

describe('isCurrentUserAdmin', () => {
  afterEach(() => mockGetSupabase.mockReset());

  it('retorna false sem client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(isCurrentUserAdmin()).resolves.toBe(false);
  });

  it('retorna false sem sessão', async () => {
    mockGetSupabase.mockReturnValue(createClient({ userId: null }));
    await expect(isCurrentUserAdmin()).resolves.toBe(false);
  });

  it('retorna true quando profiles.is_admin é true', async () => {
    mockGetSupabase.mockReturnValue(
      createClient({ userId: 'u1', profile: { is_admin: true } }),
    );
    await expect(isCurrentUserAdmin()).resolves.toBe(true);
  });

  it('retorna false quando profiles.is_admin é false', async () => {
    mockGetSupabase.mockReturnValue(
      createClient({ userId: 'u1', profile: { is_admin: false } }),
    );
    await expect(isCurrentUserAdmin()).resolves.toBe(false);
  });

  it('retorna false quando não há profile (null)', async () => {
    mockGetSupabase.mockReturnValue(
      createClient({ userId: 'u1', profile: null }),
    );
    await expect(isCurrentUserAdmin()).resolves.toBe(false);
  });

  it('propaga erro do PostgREST', async () => {
    mockGetSupabase.mockReturnValue(
      createClient({
        userId: 'u1',
        profileError: { message: 'boom', details: '', hint: '', code: '42501' },
      }),
    );
    await expect(isCurrentUserAdmin()).rejects.toBeDefined();
  });
});
