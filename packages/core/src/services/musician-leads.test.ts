import type { MusicianLeadInput } from '../schemas/musician-lead';
import {
  createMusicianLead,
  listMusicianLeads,
  MUSICIAN_LEADS_PAGE_SIZE,
  type MusicianLeadCursor,
} from './musician-leads';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

function makeClient(options: { rpcError?: Error; data?: unknown } = {}) {
  // 'data' in options, não ??: o teste de "RPC não devolveu id" passa data null
  // de propósito, e o ?? o trocaria de volta pelo id default.
  const data = options.rpcError ? null : 'data' in options ? options.data : 'lead-uuid-1';
  const rpc = jest.fn().mockResolvedValue({ data, error: options.rpcError ?? null });
  return { rpc };
}

const INPUT: MusicianLeadInput = {
  name: 'Trio do Cais',
  phone: '(48) 99999-1234',
  region: 'Grande Florianópolis',
  musicStyleIds: ['samba', 'pagode'],
  instagram: 'triodocais',
  priceRange: 'R$ 500 a R$ 800 por show',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createMusicianLead', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(createMusicianLead(INPUT)).rejects.toThrow('Supabase não configurado');
  });

  it('chama a RPC com o payload p_* e devolve o id', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(createMusicianLead(INPUT)).resolves.toBe('lead-uuid-1');
    expect(client.rpc).toHaveBeenCalledWith('create_musician_lead', {
      p_name: 'Trio do Cais',
      p_phone: '(48) 99999-1234',
      p_region: 'Grande Florianópolis',
      p_music_style_ids: ['samba', 'pagode'],
      p_instagram: 'triodocais',
      p_price_range: 'R$ 500 a R$ 800 por show',
    });
  });

  // Faixa de valor é opcional: a coluna é anulável e '' viraria uma faixa fantasma.
  it('manda null quando a faixa de valor não foi preenchida', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await createMusicianLead({ ...INPUT, priceRange: '' });

    expect(client.rpc).toHaveBeenCalledWith(
      'create_musician_lead',
      expect.objectContaining({ p_price_range: null }),
    );
  });

  // O handle é gravado sem '@', como establishments.instagram.
  it('normaliza o @ do Instagram antes de enviar', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await createMusicianLead({ ...INPUT, instagram: '@triodocais' });

    expect(client.rpc).toHaveBeenCalledWith(
      'create_musician_lead',
      expect.objectContaining({ p_instagram: 'triodocais' }),
    );
  });

  it('propaga erro do Postgrest (ex: RPC negada)', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ rpcError: new Error('permission denied') }));
    await expect(createMusicianLead(INPUT)).rejects.toThrow('permission denied');
  });

  it('lança quando a RPC não devolve id', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ data: null }));
    await expect(createMusicianLead(INPUT)).rejects.toThrow(
      'RPC create_musician_lead não retornou o id',
    );
  });

  describe('validação Zod antes do round-trip', () => {
    beforeEach(() => {
      mockGetSupabase.mockReturnValue(makeClient());
    });

    it('rejeita nome vazio', async () => {
      await expect(createMusicianLead({ ...INPUT, name: '   ' })).rejects.toThrow();
    });

    it('rejeita telefone incompleto', async () => {
      await expect(createMusicianLead({ ...INPUT, phone: '(48) 9999' })).rejects.toThrow();
    });

    it('rejeita lista de estilos vazia', async () => {
      await expect(createMusicianLead({ ...INPUT, musicStyleIds: [] })).rejects.toThrow();
    });

    it('rejeita Instagram com caractere fora do alfabeto do handle', async () => {
      await expect(
        createMusicianLead({ ...INPUT, instagram: 'trio/do/cais' }),
      ).rejects.toThrow();
    });

    it('rejeita região acima do teto de 120 caracteres', async () => {
      await expect(
        createMusicianLead({ ...INPUT, region: 'a'.repeat(121) }),
      ).rejects.toThrow();
    });

    // Entrada inválida não pode chegar ao banco.
    it('não chama a RPC quando a validação falha', async () => {
      const client = makeClient();
      mockGetSupabase.mockReturnValue(client);

      await expect(createMusicianLead({ ...INPUT, name: '' })).rejects.toThrow();
      expect(client.rpc).not.toHaveBeenCalled();
    });
  });
});

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    name: 'Trio do Cais',
    phone: '48999991234',
    region: 'Grande Florianópolis',
    music_style_ids: ['samba'],
    instagram: 'triodocais',
    price_range: 'R$ 500 a R$ 800',
    created_at: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeListClient(options: { rpcError?: Error; rows?: unknown[] } = {}) {
  const rpc = jest
    .fn()
    .mockResolvedValue({ data: options.rows ?? [], error: options.rpcError ?? null });
  return { rpc };
}

const CURSOR: MusicianLeadCursor = {
  createdAt: '2026-08-01T00:00:00.000Z',
  name: 'Anterior',
  region: 'Norte',
  id: 'lead-0',
};

describe('listMusicianLeads', () => {
  it('retorna página vazia sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listMusicianLeads({}, 'recent', null)).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it('monta os parâmetros da RPC a partir de filtros, sort e cursor', async () => {
    const client = makeListClient();
    mockGetSupabase.mockReturnValue(client);

    await listMusicianLeads(
      { search: 'trio', musicStyleId: 'samba', region: 'Floripa' },
      'name',
      CURSOR,
    );

    expect(client.rpc).toHaveBeenCalledWith('list_musician_leads', {
      p_search: 'trio',
      p_music_style_id: 'samba',
      p_region: 'Floripa',
      p_sort: 'name',
      p_cursor_created_at: CURSOR.createdAt,
      p_cursor_name: CURSOR.name,
      p_cursor_region: CURSOR.region,
      p_cursor_id: CURSOR.id,
      p_limit: MUSICIAN_LEADS_PAGE_SIZE,
    });
  });

  it('usa null para filtros e cursor ausentes', async () => {
    const client = makeListClient();
    mockGetSupabase.mockReturnValue(client);

    await listMusicianLeads({}, 'recent', null);

    expect(client.rpc).toHaveBeenCalledWith(
      'list_musician_leads',
      expect.objectContaining({
        p_search: null,
        p_music_style_id: null,
        p_region: null,
        p_cursor_created_at: null,
        p_cursor_name: null,
        p_cursor_region: null,
        p_cursor_id: null,
      }),
    );
  });

  it('nextCursor é null quando a página vem menor que o tamanho máximo', async () => {
    mockGetSupabase.mockReturnValue(makeListClient({ rows: [makeRow()] }));

    const page = await listMusicianLeads({}, 'recent', null);
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
  });

  it('monta nextCursor a partir do último item quando a página vem cheia', async () => {
    const rows = Array.from({ length: MUSICIAN_LEADS_PAGE_SIZE }, (_, i) =>
      makeRow({ id: `lead-${i}`, name: `Banda ${i}`, region: `Região ${i}` }),
    );
    mockGetSupabase.mockReturnValue(makeListClient({ rows }));

    const page = await listMusicianLeads({}, 'recent', null);
    const last = rows.at(-1) as ReturnType<typeof makeRow>;
    expect(page.nextCursor).toEqual({
      createdAt: last.created_at,
      name: last.name,
      region: last.region,
      id: last.id,
    });
  });

  it('propaga erro do Postgrest', async () => {
    mockGetSupabase.mockReturnValue(
      makeListClient({ rpcError: new Error('permission denied') }),
    );
    await expect(listMusicianLeads({}, 'recent', null)).rejects.toThrow('permission denied');
  });
});
