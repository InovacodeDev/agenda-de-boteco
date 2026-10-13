import {
  calculateRatingsSummary,
  getOwnerRatingsSummary,
  getUserEstablishmentRating,
  listEstablishmentRatingsForOwner,
  upsertEstablishmentRating,
} from './establishment-ratings';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

beforeEach(() => {
  mockGetSupabase.mockReset();
});

describe('getUserEstablishmentRating', () => {
  it('retorna null se Supabase não estiver configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    const res = await getUserEstablishmentRating('bar-1');
    expect(res).toBeNull();
  });

  it('retorna null se não houver usuário autenticado', async () => {
    const client = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    };
    mockGetSupabase.mockReturnValue(client);
    const res = await getUserEstablishmentRating('bar-1');
    expect(res).toBeNull();
  });

  it('retorna null se o usuário ainda não tiver avaliado o bar', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqUser = jest.fn().mockReturnValue({ maybeSingle });
    const eqEst = jest.fn().mockReturnValue({ eq: eqUser });
    const select = jest.fn().mockReturnValue({ eq: eqEst });
    const from = jest.fn().mockReturnValue({ select });
    const client = {
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
      from,
    };
    mockGetSupabase.mockReturnValue(client);

    const res = await getUserEstablishmentRating('bar-1');
    expect(res).toBeNull();
    expect(from).toHaveBeenCalledWith('establishment_ratings');
  });

  it('retorna a avaliação quando ela existe', async () => {
    const row = {
      id: 'a1111111-1111-1111-1111-111111111111',
      establishment_id: 'bar-1',
      user_id: '00000000-0000-0000-0000-000000000001',
      rating: 5,
      created_at: '2026-09-11T12:00:00Z',
      updated_at: '2026-09-11T12:00:00Z',
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eqUser = jest.fn().mockReturnValue({ maybeSingle });
    const eqEst = jest.fn().mockReturnValue({ eq: eqUser });
    const select = jest.fn().mockReturnValue({ eq: eqEst });
    const from = jest.fn().mockReturnValue({ select });
    const client = {
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
      from,
    };
    mockGetSupabase.mockReturnValue(client);

    const res = await getUserEstablishmentRating('bar-1');
    expect(res).toEqual(row);
  });
});

describe('upsertEstablishmentRating', () => {
  it('rejeita nota menor que 1 ou maior que 5 via Zod', async () => {
    mockGetSupabase.mockReturnValue({});
    await expect(
      upsertEstablishmentRating({ establishmentId: 'bar-1', rating: 0 as unknown as number }),
    ).rejects.toThrow();
    await expect(
      upsertEstablishmentRating({ establishmentId: 'bar-1', rating: 6 as unknown as number }),
    ).rejects.toThrow();
  });

  it('lança erro se usuário não estiver autenticado', async () => {
    const client = {
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      },
    };
    mockGetSupabase.mockReturnValue(client);
    await expect(
      upsertEstablishmentRating({ establishmentId: 'bar-1', rating: 4 }),
    ).rejects.toThrow('Usuário não autenticado');
  });

  it('insere nova avaliação quando o usuário ainda não avaliou', async () => {
    const row = {
      id: 'a1111111-1111-1111-1111-111111111111',
      establishment_id: 'bar-1',
      user_id: '00000000-0000-0000-0000-000000000001',
      rating: 4,
      created_at: '2026-09-11T12:00:00Z',
      updated_at: '2026-09-11T12:00:00Z',
    };

    // Consulta de existing retorna null
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqUser = jest.fn().mockReturnValue({ maybeSingle });
    const eqEst = jest.fn().mockReturnValue({ eq: eqUser });
    const selectCheck = jest.fn().mockReturnValue({ eq: eqEst });

    // Inserção
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const selectInsert = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select: selectInsert });

    const from = jest.fn(() => ({
      select: selectCheck,
      insert,
    }));

    const client = {
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
      from,
    };
    mockGetSupabase.mockReturnValue(client);

    const res = await upsertEstablishmentRating({ establishmentId: 'bar-1', rating: 4 });
    expect(res).toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      establishment_id: 'bar-1',
      user_id: '00000000-0000-0000-0000-000000000001',
      rating: 4,
    });
  });

  it('atualiza avaliação existente quando o usuário já avaliou o bar', async () => {
    const existingRow = {
      id: 'a1111111-1111-1111-1111-111111111111',
      establishment_id: 'bar-1',
      user_id: '00000000-0000-0000-0000-000000000001',
      rating: 3,
      created_at: '2026-09-11T12:00:00Z',
      updated_at: '2026-09-11T12:00:00Z',
    };
    const updatedRow = {
      ...existingRow,
      rating: 5,
      updated_at: '2026-09-11T12:30:00Z',
    };

    // Consulta de existing retorna existingRow
    const maybeSingle = jest.fn().mockResolvedValue({ data: existingRow, error: null });
    const eqUser = jest.fn().mockReturnValue({ maybeSingle });
    const eqEst = jest.fn().mockReturnValue({ eq: eqUser });
    const selectCheck = jest.fn().mockReturnValue({ eq: eqEst });

    // Atualização
    const single = jest.fn().mockResolvedValue({ data: updatedRow, error: null });
    const selectUpdate = jest.fn().mockReturnValue({ single });
    const eqId = jest.fn().mockReturnValue({ select: selectUpdate });
    const update = jest.fn().mockReturnValue({ eq: eqId });

    const from = jest.fn(() => ({
      select: selectCheck,
      update,
    }));

    const client = {
      auth: {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: '00000000-0000-0000-0000-000000000001' } } } }),
      },
      from,
    };
    mockGetSupabase.mockReturnValue(client);

    const res = await upsertEstablishmentRating({ establishmentId: 'bar-1', rating: 5 });
    expect(res).toEqual(updatedRow);
    expect(update).toHaveBeenCalledWith({ rating: 5 });
    expect(eqId).toHaveBeenCalledWith('id', 'a1111111-1111-1111-1111-111111111111');
  });
});

function ratingRow(id: string, createdAt: string, rating = 5) {
  return {
    id,
    establishment_id: 'bar-1',
    rating,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

const UUID_A = 'a1111111-1111-1111-1111-111111111111';
const UUID_B = 'b2222222-2222-2222-2222-222222222222';

function mockRatingsQuery(result: { data: unknown; error: unknown }) {
  const limit = jest.fn().mockResolvedValue(result);
  const orderId = jest.fn().mockReturnValue({ limit });
  const orderCreated = jest.fn().mockReturnValue({ order: orderId });
  const or = jest.fn().mockReturnValue({ order: orderCreated });
  const eq = jest.fn().mockReturnValue({ or, order: orderCreated });
  const select = jest.fn().mockReturnValue({ eq });
  mockGetSupabase.mockReturnValue({ from: jest.fn().mockReturnValue({ select }) });
  return { or, eq, orderCreated, orderId, limit };
}

describe('listEstablishmentRatingsForOwner', () => {
  it('retorna página vazia se Supabase não estiver configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    const res = await listEstablishmentRatingsForOwner('bar-1');
    expect(res).toEqual({ items: [], nextCursor: null });
  });

  it('omite user_id, ordena por created_at/id desc e limita ao tamanho da página', async () => {
    const q = mockRatingsQuery({
      data: [ratingRow(UUID_A, '2026-09-11T12:00:00Z', 5), ratingRow(UUID_B, '2026-09-10T12:00:00Z', 4)],
      error: null,
    });

    const res = await listEstablishmentRatingsForOwner('bar-1', null, 5);

    expect(res.items).toHaveLength(2);
    expect(res.items.every((item) => item.user_id === null)).toBe(true);
    expect(res.nextCursor).toBeNull();
    expect(q.eq).toHaveBeenCalledWith('establishment_id', 'bar-1');
    expect(q.orderCreated).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(q.orderId).toHaveBeenCalledWith('id', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(5);
    expect(q.or).not.toHaveBeenCalled();
  });

  it('calcula nextCursor quando a página vem cheia', async () => {
    mockRatingsQuery({
      data: [ratingRow(UUID_A, '2026-09-11T12:00:00Z'), ratingRow(UUID_B, '2026-09-10T12:00:00Z')],
      error: null,
    });

    const res = await listEstablishmentRatingsForOwner('bar-1', null, 2);

    expect(res.nextCursor).toBe(`2026-09-10T12:00:00Z|${UUID_B}`);
  });

  it('repassa o cursor como filtro keyset (created_at, id) decrescente', async () => {
    const q = mockRatingsQuery({ data: [], error: null });

    await listEstablishmentRatingsForOwner('bar-1', `2026-09-10T12:00:00Z|${UUID_B}`);

    expect(q.or).toHaveBeenCalledWith(
      `created_at.lt."2026-09-10T12:00:00Z",and(created_at.eq."2026-09-10T12:00:00Z",id.lt."${UUID_B}")`,
    );
  });

  it('relança erro do Postgrest', async () => {
    const error = new Error('select failed');
    mockRatingsQuery({ data: null, error });

    await expect(listEstablishmentRatingsForOwner('bar-1')).rejects.toBeDefined();
  });
});

describe('getOwnerRatingsSummary', () => {
  it('retorna resumo zerado se Supabase não estiver configurado', async () => {
    mockGetSupabase.mockReturnValue(null);
    await expect(getOwnerRatingsSummary('bar-1')).resolves.toEqual({
      avg: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('agrega a distribuição vinda da RPC (total bigint como string)', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        { rating: 5, total: '3' },
        { rating: 2, total: 1 },
      ],
      error: null,
    });
    mockGetSupabase.mockReturnValue({ rpc });

    const res = await getOwnerRatingsSummary('bar-1');

    expect(rpc).toHaveBeenCalledWith('get_owned_ratings_distribution', {
      p_establishment_id: 'bar-1',
    });
    expect(res).toEqual({ avg: 4.3, count: 4, distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 3 } });
  });

  it('relança erro da RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: new Error('rpc failed') });
    mockGetSupabase.mockReturnValue({ rpc });

    await expect(getOwnerRatingsSummary('bar-1')).rejects.toBeDefined();
  });
});

describe('calculateRatingsSummary', () => {
  it('retorna zeros e distribuição vazia se não houver avaliações', () => {
    const summary = calculateRatingsSummary([]);
    expect(summary).toEqual({
      avg: 0,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  it('calcula média e distribuição com precisão de 1 casa decimal', () => {
    const ratings = [
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
      { rating: 1 },
    ];
    // Soma: 5+5+4+3+1 = 18. Count: 5. 18 / 5 = 3.6
    const summary = calculateRatingsSummary(ratings);
    expect(summary.count).toBe(5);
    expect(summary.avg).toBe(3.6);
    expect(summary.distribution).toEqual({
      1: 1,
      2: 0,
      3: 1,
      4: 1,
      5: 2,
    });
  });

  it('processa e agrega corretamente 10.000 avaliações', () => {
    const ratings: { rating: number }[] = [];
    for (let i = 0; i < 5000; i++) ratings.push({ rating: 5 });
    for (let i = 0; i < 3000; i++) ratings.push({ rating: 4 });
    for (let i = 0; i < 1000; i++) ratings.push({ rating: 3 });
    for (let i = 0; i < 600; i++) ratings.push({ rating: 2 });
    for (let i = 0; i < 400; i++) ratings.push({ rating: 1 });

    const summary = calculateRatingsSummary(ratings);
    expect(summary.count).toBe(10000);
    expect(summary.distribution[5]).toBe(5000);
    expect(summary.distribution[4]).toBe(3000);
    expect(summary.distribution[3]).toBe(1000);
    expect(summary.distribution[2]).toBe(600);
    expect(summary.distribution[1]).toBe(400);
    expect(summary.avg).toBe(4.2);
  });
});
