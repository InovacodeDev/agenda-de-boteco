import {
  listModerationTerms,
  listPendingModeration,
  screenContent,
  type ScreenContentInput,
} from './moderation';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

// A flag é lida de FEATURES em tempo de chamada; o mock deixa cada teste
// escolher o estado sem tocar no arquivo de features de verdade.
const mockFeatures = { contentModeration: false };
jest.mock('../config/features', () => ({
  get FEATURES() {
    return mockFeatures;
  },
}));

interface ClientOptions {
  terms?: string[];
  termsError?: Error;
  insertError?: Error;
  pending?: Array<Record<string, unknown>>;
  pendingError?: Error;
}

function makeClient(options: ClientOptions = {}) {
  const insert = jest
    .fn()
    .mockResolvedValue({ data: null, error: options.insertError ?? null });

  // moderation_terms termina em .select(); a fila encadeia .select().eq().eq().eq().
  const pendingResult = {
    data: options.pending ?? [],
    error: options.pendingError ?? null,
  };
  const eqStatus = jest.fn().mockResolvedValue(pendingResult);
  const eqEntityId = jest.fn().mockReturnValue({ eq: eqStatus });
  const eqEntityType = jest.fn().mockReturnValue({ eq: eqEntityId });
  const select = jest.fn().mockImplementation((columns: string) => {
    if (columns === 'term') {
      return Promise.resolve({
        data: (options.terms ?? []).map((term) => ({ term })),
        error: options.termsError ?? null,
      });
    }
    return { eq: eqEntityType };
  });

  const from = jest.fn().mockReturnValue({ select, insert });
  return { from, select, insert, eqEntityType, eqEntityId, eqStatus };
}

const INPUT: ScreenContentInput = {
  entityType: 'event',
  entityId: 'evento-1',
  fields: {
    name: 'Noite do bloqueado',
    description: 'Descrição limpa, sem nada demais',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFeatures.contentModeration = false;
});

describe('screenContent com a flag desligada', () => {
  // O teste mais importante do arquivo: enquanto o item do orçamento não é
  // aprovado, a moderação não pode gerar um único round-trip.
  it('retorna [] sem tocar no Supabase', async () => {
    const client = makeClient({ terms: ['bloqueado'] });
    mockGetSupabase.mockReturnValue(client);

    await expect(screenContent(INPUT)).resolves.toEqual([]);
    expect(mockGetSupabase).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
    expect(client.select).not.toHaveBeenCalled();
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('listPendingModeration também retorna [] sem tocar no Supabase', async () => {
    const client = makeClient({ pending: [{ id: 'mod-1' }] });
    mockGetSupabase.mockReturnValue(client);

    await expect(listPendingModeration('event', 'evento-1')).resolves.toEqual([]);
    expect(mockGetSupabase).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('screenContent com a flag ligada', () => {
  beforeEach(() => {
    mockFeatures.contentModeration = true;
  });

  it('enfileira um registro por campo sinalizado, com termos e excerpt', async () => {
    const client = makeClient({ terms: ['bloqueado', 'termoproibido'] });
    mockGetSupabase.mockReturnValue(client);

    const flags = await screenContent({
      entityType: 'event',
      entityId: 'evento-1',
      fields: {
        name: 'Noite do bloqueado',
        description: 'texto com termoproibido no meio',
        attraction: 'Banda limpa',
      },
    });

    expect(flags).toEqual([
      { field: 'name', terms: ['bloqueado'], excerpt: 'Noite do bloqueado' },
      {
        field: 'description',
        terms: ['termoproibido'],
        excerpt: 'texto com termoproibido no meio',
      },
    ]);
    expect(client.from).toHaveBeenCalledWith('moderation_queue');
    const rows = client.insert.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        entity_type: 'event',
        entity_id: 'evento-1',
        field: 'name',
        excerpt: 'Noite do bloqueado',
        matched_terms: ['bloqueado'],
      }),
    );
    // id gerado no padrão do repo: slug da entidade + campo + sufixo.
    expect(rows[0].id).toEqual(expect.stringMatching(/^evento-1-name-[a-z0-9]+$/));
    // status/created_at ficam para o default do banco.
    expect(rows[0]).not.toHaveProperty('status');
  });

  it('não enfileira nada quando nenhum campo casa', async () => {
    const client = makeClient({ terms: ['bloqueado'] });
    mockGetSupabase.mockReturnValue(client);

    await expect(
      screenContent({
        entityType: 'establishment',
        entityId: 'bar-1',
        fields: { name: 'Bar do Tito', description: 'Boteco tradicional' },
      }),
    ).resolves.toEqual([]);
    expect(client.insert).not.toHaveBeenCalled();
  });

  // Substring não vale: "bloqueadores" não pode enfileirar "bloqueado".
  it('não enfileira por substring', async () => {
    const client = makeClient({ terms: ['bloqueado'] });
    mockGetSupabase.mockReturnValue(client);

    await expect(
      screenContent({
        entityType: 'establishment',
        entityId: 'bar-1',
        fields: { description: 'Vendemos bloqueadores solares' },
      }),
    ).resolves.toEqual([]);
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('não vai ao insert quando a lista de termos está vazia', async () => {
    const client = makeClient({ terms: [] });
    mockGetSupabase.mockReturnValue(client);

    await expect(screenContent(INPUT)).resolves.toEqual([]);
    expect(client.from).toHaveBeenCalledWith('moderation_terms');
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('retorna [] sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(screenContent(INPUT)).resolves.toEqual([]);
  });

  it('propaga erro do insert (ex: RLS de outro dono)', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({ terms: ['bloqueado'], insertError: new Error('rls denied') }),
    );
    await expect(screenContent(INPUT)).rejects.toThrow('rls denied');
  });
});

describe('listModerationTerms', () => {
  // Não é gated pela flag: é leitura pura de uma tabela e é o que screenContent
  // consome. A flag protege o efeito colateral, não a consulta.
  it('retorna [] sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listModerationTerms()).resolves.toEqual([]);
  });

  it('devolve os termos cadastrados', async () => {
    const client = makeClient({ terms: ['bloqueado', 'termoproibido'] });
    mockGetSupabase.mockReturnValue(client);

    await expect(listModerationTerms()).resolves.toEqual(['bloqueado', 'termoproibido']);
    expect(client.from).toHaveBeenCalledWith('moderation_terms');
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ termsError: new Error('rls denied') }));
    await expect(listModerationTerms()).rejects.toThrow('rls denied');
  });
});

describe('listPendingModeration com a flag ligada', () => {
  beforeEach(() => {
    mockFeatures.contentModeration = true;
  });

  it('filtra por entidade e status pendente', async () => {
    const client = makeClient({
      pending: [
        {
          id: 'mod-1',
          field: 'description',
          excerpt: 'texto suspeito',
          matched_terms: ['bloqueado'],
          created_at: '2026-08-13T12:00:00.000Z',
        },
      ],
    });
    mockGetSupabase.mockReturnValue(client);

    await expect(listPendingModeration('event', 'evento-1')).resolves.toEqual([
      {
        id: 'mod-1',
        field: 'description',
        excerpt: 'texto suspeito',
        matchedTerms: ['bloqueado'],
        createdAt: '2026-08-13T12:00:00.000Z',
      },
    ]);
    expect(client.from).toHaveBeenCalledWith('moderation_queue');
    expect(client.eqEntityType).toHaveBeenCalledWith('entity_type', 'event');
    expect(client.eqEntityId).toHaveBeenCalledWith('entity_id', 'evento-1');
    expect(client.eqStatus).toHaveBeenCalledWith('status', 'pending');
  });

  it('trata matched_terms nulo como lista vazia', async () => {
    mockGetSupabase.mockReturnValue(
      makeClient({
        pending: [
          {
            id: 'mod-1',
            field: 'name',
            excerpt: 'trecho',
            matched_terms: null,
            created_at: '2026-08-13T12:00:00.000Z',
          },
        ],
      }),
    );

    const pending = await listPendingModeration('establishment', 'bar-1');
    expect(pending[0].matchedTerms).toEqual([]);
  });

  it('retorna [] sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(listPendingModeration('event', 'evento-1')).resolves.toEqual([]);
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ pendingError: new Error('rls denied') }));
    await expect(listPendingModeration('event', 'evento-1')).rejects.toThrow('rls denied');
  });
});
