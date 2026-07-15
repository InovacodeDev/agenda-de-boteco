/**
 * Contrato das fachadas de escrita do catálogo.
 * - Sem Supabase (getConfiguredSupabase === null): toda escrita LANÇA.
 * - Com client fake: upsert retorna o objeto validado pelo schema; delete
 *   resolve void; id é gerado a partir de name/title quando ausente; erro do
 *   PostgREST propaga.
 */
import {
  establishmentSchema,
  eventSchema,
  notificationSchema,
} from '../schemas';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

import {
  deleteEstablishment,
  deleteEvent,
  deleteNotification,
  upsertEstablishment,
  upsertEvent,
  upsertNotification,
} from './catalog';

type Row = Record<string, unknown>;
type FakeError = { message: string; details: string; hint: string; code: string };

const POSTGREST_ERROR: FakeError = {
  message: 'boom',
  details: '',
  hint: '',
  code: '23505',
};

/**
 * Client fake que captura a row escrita e a devolve no .select().single(),
 * simulando o retorno do PostgREST (a row persistida). Campos derivados que o
 * banco preencheria são injetados aqui (rating_*, created_at, read).
 */
function createWriteClient(
  derived: Row = {},
  injectedError: FakeError | null = null,
) {
  const captured: { table?: string; op?: string; row?: Row; deletedId?: unknown } =
    {};

  function builder() {
    const chain = {
      upsert(row: Row) {
        captured.op = 'upsert';
        captured.row = row;
        return chain;
      },
      delete() {
        captured.op = 'delete';
        return chain;
      },
      select() {
        return chain;
      },
      eq(_column: string, value: unknown) {
        captured.deletedId = value;
        if (captured.op === 'delete') {
          return Promise.resolve({ error: injectedError });
        }
        return chain;
      },
      async single() {
        if (injectedError) {
          return { data: null, error: injectedError };
        }
        return { data: { ...captured.row, ...derived }, error: null };
      },
    };
    return chain;
  }

  return {
    captured,
    client: {
      from(table: string) {
        captured.table = table;
        return builder();
      },
    },
  };
}

const ESTABLISHMENT_INPUT = {
  name: 'Bar do Zé',
  description: 'Boteco raiz',
  logo_url: 'https://x.test/logo.png',
  cover_url: 'https://x.test/cover.png',
  address: 'Rua A, 1',
  neighborhood: 'Centro',
  city_id: 'floripa',
  lat: -27.6,
  lng: -48.5,
  whatsapp: '+5548999999999',
  opening_hours: 'Seg-Dom 18h-02h',
  menu_items: [{ name: 'Cerveja', price: 10 }],
  price_range: '$$' as const,
  ambiance: 'Animado',
  highlights: ['ao vivo'],
  menu_photo_urls: [],
};

const ESTABLISHMENT_DERIVED = { rating_avg: 0, rating_count: 0 };

const EVENT_INPUT = {
  name: 'Samba na Varanda',
  attraction: 'Grupo X',
  description: 'Roda de samba',
  banner_url: 'https://x.test/banner.png',
  photo_urls: [],
  music_style_ids: ['samba'],
  establishment_id: 'bar-do-ze',
  starts_at: '2026-07-01T22:00:00-03:00',
  ends_at: '2026-07-02T02:00:00-03:00',
  cover_charge: 0,
};

const NOTIFICATION_INPUT = {
  title: 'Novo evento perto de você',
  body: 'Confira',
  type: 'promo' as const,
};

const NOTIFICATION_DERIVED = {
  created_at: '2026-06-29T12:00:00-03:00',
  read: false,
};

describe('catalog write — sem Supabase configurado', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(null);
  });

  it('upsertEstablishment lança', async () => {
    await expect(upsertEstablishment(ESTABLISHMENT_INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('upsertEvent lança', async () => {
    await expect(upsertEvent(EVENT_INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('upsertNotification lança', async () => {
    await expect(upsertNotification(NOTIFICATION_INPUT)).rejects.toThrow(
      'Supabase não configurado',
    );
  });

  it('deletes lançam', async () => {
    await expect(deleteEstablishment('x')).rejects.toThrow();
    await expect(deleteEvent('x')).rejects.toThrow();
    await expect(deleteNotification('x')).rejects.toThrow();
  });
});

describe('catalog write — caminho Supabase (client fake)', () => {
  it('upsertEstablishment retorna objeto validado e gera id/slug do name', async () => {
    const { client, captured } = createWriteClient(ESTABLISHMENT_DERIVED);
    mockGetSupabase.mockReturnValue(client);

    const result = await upsertEstablishment(ESTABLISHMENT_INPUT);

    expect(captured.table).toBe('establishments');
    expect((captured.row as Row).id).toBe('bar-do-ze');
    expect((captured.row as Row).slug).toBe('bar-do-ze');
    // location e rating_* não são enviados
    expect(captured.row).not.toHaveProperty('location');
    expect(captured.row).not.toHaveProperty('rating_avg');
    expect(result.id).toBe('bar-do-ze');
    expect(() => establishmentSchema.parse(result)).not.toThrow();
  });

  it('upsertEstablishment respeita id explícito', async () => {
    const { client, captured } = createWriteClient(ESTABLISHMENT_DERIVED);
    mockGetSupabase.mockReturnValue(client);

    await upsertEstablishment({ ...ESTABLISHMENT_INPUT, id: 'meu-id' });
    expect((captured.row as Row).id).toBe('meu-id');
  });

  it('upsertEvent retorna objeto validado e gera id/slug do name', async () => {
    const { client, captured } = createWriteClient();
    mockGetSupabase.mockReturnValue(client);

    const result = await upsertEvent(EVENT_INPUT);

    expect(captured.table).toBe('events');
    expect((captured.row as Row).id).toBe('samba-na-varanda');
    expect((captured.row as Row).slug).toBe('samba-na-varanda');
    expect(result.id).toBe('samba-na-varanda');
    expect(() => eventSchema.parse(result)).not.toThrow();
  });

  it('upsertNotification gera id do title e retorna objeto validado', async () => {
    const { client, captured } = createWriteClient(NOTIFICATION_DERIVED);
    mockGetSupabase.mockReturnValue(client);

    const result = await upsertNotification(NOTIFICATION_INPUT);

    expect(captured.table).toBe('notifications');
    expect((captured.row as Row).id).toBe('novo-evento-perto-de-voce');
    expect(captured.row).not.toHaveProperty('read');
    expect(captured.row).not.toHaveProperty('created_at');
    expect(result.read).toBe(false);
    expect(() => notificationSchema.parse(result)).not.toThrow();
  });

  it('deletes resolvem void e usam o id', async () => {
    const { client, captured } = createWriteClient();
    mockGetSupabase.mockReturnValue(client);

    await expect(deleteEstablishment('bar-do-ze')).resolves.toBeUndefined();
    expect(captured.table).toBe('establishments');
    expect(captured.deletedId).toBe('bar-do-ze');

    await expect(deleteEvent('ev1')).resolves.toBeUndefined();
    await expect(deleteNotification('n1')).resolves.toBeUndefined();
  });

  it('propaga erro do PostgREST no upsert', async () => {
    const { client } = createWriteClient({}, POSTGREST_ERROR);
    mockGetSupabase.mockReturnValue(client);
    await expect(upsertEvent(EVENT_INPUT)).rejects.toBe(POSTGREST_ERROR);
  });

  it('propaga erro do PostgREST no delete', async () => {
    const { client } = createWriteClient({}, POSTGREST_ERROR);
    mockGetSupabase.mockReturnValue(client);
    await expect(deleteEvent('ev1')).rejects.toBe(POSTGREST_ERROR);
  });
});
