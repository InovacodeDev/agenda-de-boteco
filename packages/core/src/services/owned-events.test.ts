import {
  deleteOwnedEvent,
  deleteOwnedEventGroup,
  MAX_RECURRENCE_COUNT,
  type OwnedEventInput,
  saveOwnedEvent,
  saveRecurringOwnedEvents,
} from './owned-events';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));

interface ClientOptions {
  insertError?: Error;
  updateError?: Error;
  deleteError?: Error;
}

function makeClient(options: ClientOptions = {}) {
  const insert = jest
    .fn()
    .mockResolvedValue({ data: null, error: options.insertError ?? null });
  const updateEq = jest
    .fn()
    .mockResolvedValue({ data: null, error: options.updateError ?? null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  // DELETE por id termina em .eq(); o de grupo encadeia .eq().gte().
  const deleteResult = { data: null, error: options.deleteError ?? null };
  const gte = jest.fn().mockResolvedValue(deleteResult);
  const deleteEq = jest.fn().mockReturnValue(
    Object.assign(Promise.resolve(deleteResult), { gte }),
  );
  const del = jest.fn().mockReturnValue({ eq: deleteEq });
  const from = jest.fn().mockReturnValue({ insert, update, delete: del });
  return { from, insert, update, updateEq, delete: del, deleteEq, gte };
}

const INPUT: OwnedEventInput = {
  name: 'Sexta do Sertanejo',
  description: 'Melhor sertanejo da ilha',
  bannerUrl: 'https://cdn.example/banner.png',
  attraction: 'Duo Violeiros',
  musicStyleIds: ['sertanejo'],
  startsAt: '2026-09-04T22:00:00.000Z',
  endsAt: '2026-09-05T02:00:00.000Z',
  coverCharge: 20,
  capacity: 150,
  courtesy: 'Primeira dose',
  promo: 'Chope em dobro',
  status: 'published',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveOwnedEvent', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(saveOwnedEvent('bar-1', INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('monta o payload snake_case no insert e devolve o id gerado', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    const id = await saveOwnedEvent('bar-1', INPUT);

    expect(client.from).toHaveBeenCalledWith('events');
    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        slug: id,
        establishment_id: 'bar-1',
        name: 'Sexta do Sertanejo',
        description: 'Melhor sertanejo da ilha',
        banner_url: 'https://cdn.example/banner.png',
        attraction: 'Duo Violeiros',
        music_style_ids: ['sertanejo'],
        starts_at: '2026-09-04T22:00:00.000Z',
        ends_at: '2026-09-05T02:00:00.000Z',
        cover_charge: 20,
        capacity: 150,
        courtesy: 'Primeira dose',
        promo: 'Chope em dobro',
        status: 'published',
        recurrence_group_id: null,
      }),
    );
    expect(id).toMatch(/^sexta-do-sertanejo-[a-z0-9]+$/);
  });

  // A recorrência cria vários eventos de nome idêntico; slug puro colidiria na
  // primeira repetição de "Sexta do Sertanejo".
  it('gera ids distintos para o mesmo nome', async () => {
    mockGetSupabase.mockReturnValue(makeClient());

    const first = await saveOwnedEvent('bar-1', INPUT);
    const second = await saveOwnedEvent('bar-1', INPUT);

    expect(first).not.toBe(second);
    expect(first.startsWith('sexta-do-sertanejo-')).toBe(true);
    expect(second.startsWith('sexta-do-sertanejo-')).toBe(true);
  });

  it('grava status draft como pedido', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveOwnedEvent('bar-1', { ...INPUT, status: 'draft' });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft' }),
    );
  });

  it('grava status published como pedido', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveOwnedEvent('bar-1', { ...INPUT, status: 'published' });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'published' }),
    );
  });

  // Coluna anulável: '' viraria selo de cortesia/promo vazio no card.
  it('grava null quando cortesia e promo vêm vazias', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveOwnedEvent('bar-1', { ...INPUT, courtesy: '', promo: '' });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ courtesy: null, promo: null }),
    );
  });

  it('aceita capacity null (dono não controla lotação)', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveOwnedEvent('bar-1', { ...INPUT, capacity: null });

    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: null }),
    );
  });

  it('faz UPDATE na linha do evento quando recebe eventId', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(saveOwnedEvent('bar-1', INPUT, 'evento-1')).resolves.toBe('evento-1');
    expect(client.insert).not.toHaveBeenCalled();
    expect(client.updateEq).toHaveBeenCalledWith('id', 'evento-1');
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sexta do Sertanejo', status: 'published' }),
    );
  });

  // Editar uma ocorrência não deve desligá-la da série.
  it('não toca em recurrence_group_id no update', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveOwnedEvent('bar-1', INPUT, 'evento-1');

    const payload = client.update.mock.calls[0][0];
    expect(payload).not.toHaveProperty('recurrence_group_id');
    expect(payload).not.toHaveProperty('id');
  });

  it('propaga erro do Supabase (ex: RLS de outro dono)', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ insertError: new Error('rls denied') }));
    await expect(saveOwnedEvent('bar-1', INPUT)).rejects.toThrow('rls denied');
  });
});

describe('saveRecurringOwnedEvents', () => {
  function insertedRows(client: ReturnType<typeof makeClient>) {
    return client.insert.mock.calls[0][0] as Array<Record<string, unknown>>;
  }

  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(
      saveRecurringOwnedEvents('bar-1', INPUT, { frequency: 'weekly', count: 4 }),
    ).rejects.toThrow('Supabase não configurado');
  });

  it('cria N ocorrências com o mesmo recurrence_group_id', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    const ids = await saveRecurringOwnedEvents('bar-1', INPUT, {
      frequency: 'weekly',
      count: 4,
    });

    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    const rows = insertedRows(client);
    expect(rows).toHaveLength(4);
    const groupIds = new Set(rows.map((row) => row.recurrence_group_id));
    expect(groupIds.size).toBe(1);
    expect([...groupIds][0]).toEqual(expect.stringMatching(/^rec-sexta-do-sertanejo-/));
  });

  it('desloca +7 dias por ocorrência preservando o horário (weekly)', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await saveRecurringOwnedEvents('bar-1', INPUT, { frequency: 'weekly', count: 3 });

    const rows = insertedRows(client);
    const starts = rows.map((row) => row.starts_at as string);
    // A primeira ocorrência usa a data do input, sem deslocamento.
    expect(starts[0]).toBe(INPUT.startsAt);
    for (let i = 1; i < starts.length; i++) {
      const previous = new Date(starts[i - 1]);
      const current = new Date(starts[i]);
      expect(current.getTime() - previous.getTime()).toBe(7 * 86_400_000);
      expect(current.getHours()).toBe(previous.getHours());
      expect(current.getMinutes()).toBe(previous.getMinutes());
    }
    // ends_at acompanha o mesmo deslocamento.
    const ends = rows.map((row) => row.ends_at as string);
    expect(new Date(ends[1]).getTime() - new Date(ends[0]).getTime()).toBe(
      7 * 86_400_000,
    );
  });

  it('desloca +1 mês preservando dia e horário (monthly)', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    // 10/mar/2026 20:00 local — dia 10 existe em todos os meses.
    const startsAt = new Date(2026, 2, 10, 20, 0, 0, 0).toISOString();
    const endsAt = new Date(2026, 2, 10, 23, 30, 0, 0).toISOString();

    await saveRecurringOwnedEvents(
      'bar-1',
      { ...INPUT, startsAt, endsAt },
      { frequency: 'monthly', count: 3 },
    );

    const starts = insertedRows(client).map((row) => new Date(row.starts_at as string));
    expect(starts.map((date) => date.getMonth())).toEqual([2, 3, 4]);
    for (const date of starts) {
      expect(date.getDate()).toBe(10);
      expect(date.getHours()).toBe(20);
      expect(date.getMinutes()).toBe(0);
    }
  });

  // 31/jan + 1 mês clampa no último dia de fevereiro em vez de pular para março:
  // uma recorrência mensal que cai em outro mês deixa de ser mensal.
  it('clampa 31 de janeiro no último dia de fevereiro', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);
    const startsAt = new Date(2026, 0, 31, 21, 0, 0, 0).toISOString();
    const endsAt = new Date(2026, 1, 1, 1, 0, 0, 0).toISOString();

    await saveRecurringOwnedEvents(
      'bar-1',
      { ...INPUT, startsAt, endsAt },
      { frequency: 'monthly', count: 3 },
    );

    const starts = insertedRows(client).map((row) => new Date(row.starts_at as string));
    // 2026 não é bissexto: fevereiro termina em 28.
    expect([starts[0].getMonth(), starts[0].getDate()]).toEqual([0, 31]);
    expect([starts[1].getMonth(), starts[1].getDate()]).toEqual([1, 28]);
    expect([starts[2].getMonth(), starts[2].getDate()]).toEqual([2, 31]);
    for (const date of starts) {
      expect(date.getHours()).toBe(21);
    }
  });

  it('respeita o teto de 52 ocorrências', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    const ids = await saveRecurringOwnedEvents('bar-1', INPUT, {
      frequency: 'weekly',
      count: 500,
    });

    expect(MAX_RECURRENCE_COUNT).toBe(52);
    expect(ids).toHaveLength(52);
    expect(insertedRows(client)).toHaveLength(52);
  });

  it('propaga erro do Supabase sem gravar meia série', async () => {
    const client = makeClient({ insertError: new Error('capacity must be positive') });
    mockGetSupabase.mockReturnValue(client);

    await expect(
      saveRecurringOwnedEvents('bar-1', INPUT, { frequency: 'weekly', count: 4 }),
    ).rejects.toThrow('capacity must be positive');
    // Um único INSERT em lote: nada entra quando uma linha é recusada.
    expect(client.insert).toHaveBeenCalledTimes(1);
  });
});

describe('deleteOwnedEvent', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(deleteOwnedEvent('evento-1')).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('apaga a linha do evento', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(deleteOwnedEvent('evento-1')).resolves.toBeUndefined();
    expect(client.from).toHaveBeenCalledWith('events');
    expect(client.deleteEq).toHaveBeenCalledWith('id', 'evento-1');
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ deleteError: new Error('rls denied') }));
    await expect(deleteOwnedEvent('evento-1')).rejects.toThrow('rls denied');
  });
});

describe('deleteOwnedEventGroup', () => {
  it('lança sem Supabase configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(deleteOwnedEventGroup('rec-1')).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  // Só as futuras: as ocorrências já realizadas são histórico do bar.
  it('apaga apenas as ocorrências que ainda não aconteceram', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(deleteOwnedEventGroup('rec-1')).resolves.toBeUndefined();
    expect(client.deleteEq).toHaveBeenCalledWith('recurrence_group_id', 'rec-1');
    expect(client.gte).toHaveBeenCalledWith('starts_at', expect.any(String));
    const cutoff = client.gte.mock.calls[0][1] as string;
    expect(Math.abs(Date.now() - Date.parse(cutoff))).toBeLessThan(5_000);
  });

  it('propaga erro do Supabase', async () => {
    mockGetSupabase.mockReturnValue(makeClient({ deleteError: new Error('rls denied') }));
    await expect(deleteOwnedEventGroup('rec-1')).rejects.toThrow('rls denied');
  });
});
