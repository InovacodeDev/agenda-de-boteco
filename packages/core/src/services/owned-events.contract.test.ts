import * as errors from '../utils/errors';
import {
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
  updateError?: Error;
}

function makeClient(options: ClientOptions = {}) {
  const insert = jest.fn().mockResolvedValue({ data: null, error: null });
  const updateEq = jest
    .fn()
    .mockResolvedValue({ data: null, error: options.updateError ?? null });
  const update = jest.fn().mockReturnValue({ eq: updateEq });
  const from = jest.fn().mockReturnValue({ insert, update });
  return { from, insert, update, updateEq };
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
  courtesy: '',
  promo: '',
  status: 'published',
};

type InsertedRow = { id: string; slug: string };

function insertedRows(insert: jest.Mock): InsertedRow[] {
  const payload = insert.mock.calls[0][0] as InsertedRow | InsertedRow[];
  return Array.isArray(payload) ? payload : [payload];
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockGetSupabase.mockReset();
});

describe('Regra de negócio: recorrência e identificador de evento do dono', () => {
  it.each([
    [0, 1],
    [-3, 1],
    [100, MAX_RECURRENCE_COUNT],
  ])('count %i grava %i ocorrência(s)', async (count, expected) => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    const ids = await saveRecurringOwnedEvents('bar-1', INPUT, { frequency: 'weekly', count });

    expect(ids).toHaveLength(expected);
    expect(insertedRows(client.insert)).toHaveLength(expected);
  });

  it('usa "evento" como base do id quando o nome não gera slug', async () => {
    const client = makeClient();
    mockGetSupabase.mockReturnValue(client);

    const id = await saveOwnedEvent('bar-1', { ...INPUT, name: '!!!' });

    expect(id).toMatch(/^evento-[a-z0-9]+$/);
    expect(insertedRows(client.insert)[0]).toMatchObject({ id, slug: id });
  });
});

describe('Tratamento de erro: atualização de evento do dono', () => {
  it('propaga o erro do UPDATE sem cair em INSERT', async () => {
    const rlsError = new Error('new row violates row-level security policy');
    const client = makeClient({ updateError: rlsError });
    mockGetSupabase.mockReturnValue(client);

    await expect(saveOwnedEvent('bar-1', INPUT, 'evt-1')).rejects.toBe(rlsError);
    expect(client.updateEq).toHaveBeenCalledWith('id', 'evt-1');
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('roteia o erro do UPDATE por handleServiceError sem PII', async () => {
    const rlsError = new Error('rls');
    mockGetSupabase.mockReturnValue(makeClient({ updateError: rlsError }));
    const spy = jest.spyOn(errors, 'handleServiceError').mockImplementation((error) => {
      throw error;
    });

    await expect(saveOwnedEvent('bar-1', INPUT, 'evt-1')).rejects.toBe(rlsError);

    expect(spy).toHaveBeenCalledWith(rlsError, {
      method: 'ownedEvents.saveOwnedEvent',
      args: { establishmentId: 'bar-1', eventId: 'evt-1', name: INPUT.name },
    });
  });
});
