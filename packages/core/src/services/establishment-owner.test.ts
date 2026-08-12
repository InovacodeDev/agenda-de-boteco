import {
  createOwnedEstablishment,
  getOwnedEstablishmentId,
} from './establishment-owner';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

const SESSION = { data: { session: { user: { id: 'u1' } } } };

function makeClient(options: {
  session?: unknown;
  maybeSingle?: jest.Mock;
  rpc?: jest.Mock;
} = {}) {
  const maybeSingle =
    options.maybeSingle ?? jest.fn().mockResolvedValue({ data: null, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue(options.session ?? SESSION),
    },
    from,
    select,
    eq,
    maybeSingle,
    rpc: options.rpc ?? jest.fn().mockResolvedValue({ data: 'bar-1', error: null }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getOwnedEstablishmentId', () => {
  it('retorna null sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(getOwnedEstablishmentId()).resolves.toBeNull();
  });

  it('retorna null sem sessão ativa', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ session: { data: { session: null } } }));
    await expect(getOwnedEstablishmentId()).resolves.toBeNull();
  });

  it('retorna o establishment_id do vínculo existente', async () => {
    const client = makeClient({
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { establishment_id: 'bar-do-tito' }, error: null }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(getOwnedEstablishmentId()).resolves.toBe('bar-do-tito');
    expect(client.from).toHaveBeenCalledWith('establishment_owners');
    expect(client.eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('retorna null quando o usuário não tem vínculo', async () => {
    mockGetSupabase.mockReturnValue(makeClient());
    await expect(getOwnedEstablishmentId()).resolves.toBeNull();
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('rls denied') }),
      }),
    );
    await expect(getOwnedEstablishmentId()).rejects.toThrow('rls denied');
  });
});

describe('createOwnedEstablishment', () => {
  const INPUT = {
    name: 'Bar do Tito',
    cityId: 'florianopolis',
    address: 'Rua X, 100',
    neighborhood: 'Centro',
    whatsapp: '48999999999',
  };

  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(createOwnedEstablishment(INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('chama a RPC com os campos do onboarding e retorna o id', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'bar-do-tito-abc', error: null });
    mockGetSupabase.mockReturnValue(makeClient({ rpc }));

    await expect(createOwnedEstablishment(INPUT)).resolves.toBe('bar-do-tito-abc');
    expect(rpc).toHaveBeenCalledWith('create_owned_establishment', {
      p_name: 'Bar do Tito',
      p_city_id: 'florianopolis',
      p_address: 'Rua X, 100',
      p_neighborhood: 'Centro',
      p_whatsapp: '48999999999',
    });
  });

  it('propaga erro da RPC (ex: já é dono de um bar)', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Usuário já é dono de um estabelecimento'),
    });
    mockGetSupabase.mockReturnValue(makeClient({ rpc }));

    await expect(createOwnedEstablishment(INPUT)).rejects.toThrow(
      'Usuário já é dono de um estabelecimento',
    );
  });

  it('lança quando a RPC retorna sucesso sem id', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockGetSupabase.mockReturnValue(makeClient({ rpc }));

    await expect(createOwnedEstablishment(INPUT)).rejects.toThrow(
      'não retornou o id',
    );
  });
});
