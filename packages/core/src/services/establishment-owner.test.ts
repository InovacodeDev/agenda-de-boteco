import type { EstablishmentAttribute } from '../schemas/catalog';
import {
  claimEstablishmentOwner,
  createOwnedEstablishment,
  getOwnedEstablishmentId,
  isCurrentUserEstablishmentOwner,
  updateOwnedEstablishment,
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
  updateError?: Error;
} = {}) {
  const maybeSingle =
    options.maybeSingle ?? jest.fn().mockResolvedValue({ data: null, error: null });
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });
  // O UPDATE termina em .eq(), sem .select(): resolve direto.
  const updateEq = jest
    .fn()
    .mockResolvedValue({ data: null, error: options.updateError ?? null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  const from = jest.fn().mockReturnValue({ select, update });
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue(options.session ?? SESSION),
    },
    from,
    select,
    eq,
    update,
    updateEq,
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

describe('isCurrentUserEstablishmentOwner', () => {
  it('retorna false sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(isCurrentUserEstablishmentOwner()).resolves.toBe(false);
  });

  it('retorna false sem sessão ativa', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ session: { data: { session: null } } }));
    await expect(isCurrentUserEstablishmentOwner()).resolves.toBe(false);
  });

  it('retorna true quando a flag está ligada', async () => {
    const client = makeClient({
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { is_establishment_owner: true }, error: null }),
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(isCurrentUserEstablishmentOwner()).resolves.toBe(true);
    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(client.eq).toHaveBeenCalledWith('id', 'u1');
  });

  // Conta do app público: existe, autentica, mas não acessa o painel.
  it('retorna false quando a flag está desligada', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: { is_establishment_owner: false }, error: null }),
      }),
    );
    await expect(isCurrentUserEstablishmentOwner()).resolves.toBe(false);
  });

  it('retorna false quando o profile não existe', async () => {
    mockGetSupabase.mockReturnValue(makeClient());
    await expect(isCurrentUserEstablishmentOwner()).resolves.toBe(false);
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: null, error: new Error('rls denied') }),
      }),
    );
    await expect(isCurrentUserEstablishmentOwner()).rejects.toThrow('rls denied');
  });
});

describe('claimEstablishmentOwner', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(claimEstablishmentOwner()).rejects.toThrow('Supabase não configurado');
  });

  // A RPC não recebe e-mail nem id: age sobre auth.uid(). Passar um alvo aqui
  // seria o bug que permite promover a conta de outra pessoa.
  it('chama a RPC sem argumentos', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockGetSupabase.mockReturnValue(makeClient({ rpc }));

    await expect(claimEstablishmentOwner()).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('claim_establishment_owner');
  });

  it('propaga erro da RPC (ex: sem sessão)', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: new Error('Autenticação obrigatória'),
    });
    mockGetSupabase.mockReturnValue(makeClient({ rpc }));

    await expect(claimEstablishmentOwner()).rejects.toThrow('Autenticação obrigatória');
  });
});

describe('createOwnedEstablishment', () => {
  const INPUT = {
    name: 'Bar do Tito',
    description: 'O melhor boteco da ilha',
    logoUrl: 'https://cdn.example/logo.png',
    coverUrl: 'https://cdn.example/capa.png',
    cityId: 'florianopolis',
    address: 'Rua X, 100',
    neighborhood: 'Centro',
    whatsapp: '48999999999',
    instagram: '@bardotito',
    openingHours: 'Seg a Sáb, 18h às 02h',
    priceRange: '$$',
    ambiance: 'Boteco tradicional',
    menuUrl: 'https://cardapio.example',
    attributes: ['pet-friendly', 'live-music'] satisfies EstablishmentAttribute[],
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
      p_description: 'O melhor boteco da ilha',
      p_logo_url: 'https://cdn.example/logo.png',
      p_cover_url: 'https://cdn.example/capa.png',
      p_city_id: 'florianopolis',
      p_address: 'Rua X, 100',
      p_neighborhood: 'Centro',
      p_whatsapp: '48999999999',
      p_instagram: '@bardotito',
      p_opening_hours: 'Seg a Sáb, 18h às 02h',
      p_price_range: '$$',
      p_ambiance: 'Boteco tradicional',
      p_menu_url: 'https://cardapio.example',
      p_attributes: ['pet-friendly', 'live-music'],
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

describe('updateOwnedEstablishment', () => {
  const INPUT = {
    name: 'Bar do Tito',
    description: 'O melhor boteco da ilha',
    logoUrl: 'https://cdn.example/logo.png',
    coverUrl: 'https://cdn.example/capa.png',
    cityId: 'florianopolis',
    address: 'Rua X, 100',
    neighborhood: 'Centro',
    whatsapp: '48999999999',
    instagram: '@bardotito',
    openingHours: 'Seg a Sáb, 18h às 02h',
    priceRange: '$$' as const,
    ambiance: 'Boteco tradicional',
    menuUrl: 'https://cardapio.example',
    attributes: ['pet-friendly', 'live-music'] satisfies EstablishmentAttribute[],
  };

  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(updateOwnedEstablishment('bar-1', INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('atualiza só as colunas do formulário, na linha do bar', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(updateOwnedEstablishment('bar-1', INPUT)).resolves.toBeUndefined();
    expect(client.from).toHaveBeenCalledWith('establishments');
    expect(client.update).toHaveBeenCalledWith({
      name: 'Bar do Tito',
      description: 'O melhor boteco da ilha',
      logo_url: 'https://cdn.example/logo.png',
      cover_url: 'https://cdn.example/capa.png',
      city_id: 'florianopolis',
      address: 'Rua X, 100',
      neighborhood: 'Centro',
      whatsapp: '48999999999',
      instagram: '@bardotito',
      opening_hours: 'Seg a Sáb, 18h às 02h',
      price_range: '$$',
      ambiance: 'Boteco tradicional',
      menu_pdf_url: 'https://cardapio.example',
      attributes: ['pet-friendly', 'live-music'],
    });
    expect(client.updateEq).toHaveBeenCalledWith('id', 'bar-1');
  });

  // lat/lng e rating não são editáveis na tela; se entrassem no payload, salvar
  // o perfil zeraria a geolocalização e a nota do bar.
  it('não toca em lat/lng, rating nem menu_items', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await updateOwnedEstablishment('bar-1', INPUT);
    const payload = client.update.mock.calls[0][0];
    for (const column of ['lat', 'lng', 'rating_avg', 'rating_count', 'menu_items', 'id']) {
      expect(payload).not.toHaveProperty(column);
    }
  });

  // Coluna anulável: '' viraria um "@" vazio no perfil público.
  it('grava null quando Instagram e cardápio vêm vazios', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await updateOwnedEstablishment('bar-1', { ...INPUT, instagram: '', menuUrl: '' });
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ instagram: null, menu_pdf_url: null }),
    );
  });

  it('propaga erro do Supabase (ex: RLS de outro dono)', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ updateError: new Error('rls denied') }));
    await expect(updateOwnedEstablishment('bar-1', INPUT)).rejects.toThrow('rls denied');
  });
});
