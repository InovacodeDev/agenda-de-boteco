import type { MusicianLeadInput } from '../schemas/musician-lead';
import { createMusicianLead } from './musician-leads';

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
