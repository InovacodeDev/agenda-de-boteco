/**
 * Contrato do service de catálogo. Dois blocos cobrem os dois caminhos:
 * - Bloco A: getSupabase() === null → fallback nos mocks locais.
 * - Bloco B: getSupabase() retorna um client fake → caminho Supabase, com
 *   fixtures no formato Row do PostgREST (timestamps com offset, opcionais
 *   ausentes como null, menu_items como JSON).
 * Os asserts de contagem/ordenação/ids são idênticos nos dois blocos: o
 * comportamento observável NÃO pode divergir entre mock e Supabase.
 */
import { z } from 'zod';

import {
  CITIES,
  ESTABLISHMENTS,
  EVENT_ATTRACTIONS,
  EVENTS,
  MUSIC_STYLES,
  NOTIFICATIONS,
} from '../data';
import {
  citySchema,
  establishmentSchema,
  eventSchema,
  musicStyleSchema,
  notificationSchema,
} from '../schemas';

const mockGetSupabase = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

import {
  getEstablishment,
  getEvent,
  listCities,
  listEstablishments,
  listEventAttractions,
  listEvents,
  listEventsByEstablishment,
  listMusicStyles,
  listNotifications,
} from './catalog';

function isSortedAscByStartsAt(items: { starts_at: string }[]): boolean {
  return items.every(
    (item, index) =>
      index === 0 ||
      Date.parse(items[index - 1].starts_at) <= Date.parse(item.starts_at),
  );
}

describe('catalog service — fallback mock (client nulo)', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(null);
  });

  describe('listEvents', () => {
    it('retorna os 12 eventos do mock', async () => {
      const events = await listEvents();
      expect(events).toHaveLength(12);
    });

    it('retorna ordenado por starts_at asc', async () => {
      const events = await listEvents();
      expect(isSortedAscByStartsAt(events)).toBe(true);
    });

    it('passa na validação Zod', async () => {
      const events = await listEvents();
      expect(() => z.array(eventSchema).parse(events)).not.toThrow();
    });
  });

  describe('getEvent', () => {
    it('retorna o evento pelo id', async () => {
      const event = await getEvent('ev1');
      expect(event).not.toBeNull();
      expect(event?.id).toBe('ev1');
      expect(event?.name).toBe('Samba na Varanda');
      expect(() => eventSchema.parse(event)).not.toThrow();
    });

    it('retorna null para id inexistente', async () => {
      await expect(getEvent('nao-existe')).resolves.toBeNull();
    });
  });

  describe('listEstablishments', () => {
    it('retorna os 8 estabelecimentos do mock sem filtro', async () => {
      const establishments = await listEstablishments();
      expect(establishments).toHaveLength(8);
    });

    it("filtra por cityId: 'fln' retorna 4 estabelecimentos", async () => {
      const establishments = await listEstablishments('fln');
      expect(establishments).toHaveLength(4);
      expect(establishments.every((item) => item.city_id === 'fln')).toBe(true);
    });

    it('retorna lista vazia para cityId sem estabelecimentos', async () => {
      await expect(listEstablishments('nao-existe')).resolves.toEqual([]);
    });

    it('passa na validação Zod', async () => {
      const establishments = await listEstablishments();
      expect(() =>
        z.array(establishmentSchema).parse(establishments),
      ).not.toThrow();
    });
  });

  describe('getEstablishment', () => {
    it('retorna o estabelecimento pelo id', async () => {
      const establishment = await getEstablishment('e1');
      expect(establishment).not.toBeNull();
      expect(establishment?.name).toBe('Boteco do Zé');
      expect(() => establishmentSchema.parse(establishment)).not.toThrow();
    });

    it('retorna null para id inexistente', async () => {
      await expect(getEstablishment('nao-existe')).resolves.toBeNull();
    });

    // Regressão: o onboarding do painel cria o bar sem logo/capa (a RPC grava
    // ''), e o schema exigia URL — o estabelecimento era gravado mas quebrava
    // na leitura. Só a string vazia passa; texto arbitrário segue inválido.
    it('aceita logo_url e cover_url vazios (bar recém-criado no painel)', async () => {
      const semImagens = {
        ...(await getEstablishment('e1')),
        logo_url: '',
        cover_url: '',
      };
      expect(() => establishmentSchema.parse(semImagens)).not.toThrow();

      expect(() =>
        establishmentSchema.parse({ ...semImagens, logo_url: 'nao-e-url' }),
      ).toThrow();
    });
  });

  describe('listEventsByEstablishment', () => {
    it("retorna ev1 e ev11 para 'e1', ordenado por starts_at asc", async () => {
      const events = await listEventsByEstablishment('e1');
      expect(events.map((event) => event.id)).toEqual(['ev1', 'ev11']);
      expect(isSortedAscByStartsAt(events)).toBe(true);
    });

    it('retorna lista vazia para estabelecimento inexistente', async () => {
      await expect(listEventsByEstablishment('nao-existe')).resolves.toEqual([]);
    });
  });

  describe('listMusicStyles', () => {
    it('retorna os 10 estilos do mock validados pelo Zod', async () => {
      const styles = await listMusicStyles();
      expect(styles).toHaveLength(10);
      expect(() => z.array(musicStyleSchema).parse(styles)).not.toThrow();
    });
  });

  describe('listCities', () => {
    it('retorna as 6 cidades do mock validadas pelo Zod', async () => {
      const cities = await listCities();
      expect(cities).toHaveLength(6);
      expect(() => z.array(citySchema).parse(cities)).not.toThrow();
    });
  });

  describe('listNotifications', () => {
    it('retorna as 4 notificações do mock', async () => {
      const notifications = await listNotifications();
      expect(notifications).toHaveLength(4);
    });

    it('retorna ordenado por created_at desc', async () => {
      const notifications = await listNotifications();
      const timestamps = notifications.map((item) =>
        Date.parse(item.created_at),
      );
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it('passa na validação Zod', async () => {
      const notifications = await listNotifications();
      expect(() =>
        z.array(notificationSchema).parse(notifications),
      ).not.toThrow();
    });
  });

  describe('listEventAttractions', () => {
    it('retorna atrações do evento ordenadas por position', async () => {
      const result = await listEventAttractions('ev1');
      expect(result.map((a) => a.id)).toEqual(['att1', 'att2']);
      expect(result.every((a) => a.event_id === 'ev1')).toBe(true);
    });

    it('retorna [] para evento sem atrações', async () => {
      const result = await listEventAttractions('inexistente');
      expect(result).toEqual([]);
    });
  });
});

/**
 * Fixtures no formato Row do PostgREST, derivadas dos mocks. Diferenças do
 * formato de domínio: timestamps com offset +00:00 (não Z); opcionais ausentes
 * viram null; menu_items é array JSON; location não é selecionada (geography).
 */
type Row = Record<string, unknown>;

function isoToOffset(value: string): string {
  return value.replace(/Z$/, '+00:00');
}

function optionalToNull(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

const cityRows: Row[] = CITIES.map((city) => ({
  id: city.id,
  name: city.name,
  uf: city.uf,
  lat: city.lat,
  lng: city.lng,
  slug: optionalToNull(city.slug),
}));

const establishmentRows: Row[] = ESTABLISHMENTS.map((establishment) => ({
  id: establishment.id,
  name: establishment.name,
  description: establishment.description,
  logo_url: establishment.logo_url,
  cover_url: establishment.cover_url,
  address: establishment.address,
  neighborhood: establishment.neighborhood,
  city_id: establishment.city_id,
  lat: establishment.lat,
  lng: establishment.lng,
  whatsapp: establishment.whatsapp,
  instagram: optionalToNull(establishment.instagram),
  opening_hours: establishment.opening_hours,
  menu_items: establishment.menu_items,
  price_range: establishment.price_range,
  ambiance: establishment.ambiance,
  rating_avg: establishment.rating_avg,
  rating_count: establishment.rating_count,
  attributes: establishment.attributes,
  slug: optionalToNull(establishment.slug),
}));

const eventRows: Row[] = EVENTS.map((event) => ({
  id: event.id,
  name: event.name,
  attraction: event.attraction,
  description: event.description,
  banner_url: event.banner_url,
  music_style_ids: event.music_style_ids,
  establishment_id: event.establishment_id,
  starts_at: isoToOffset(event.starts_at),
  ends_at: isoToOffset(event.ends_at),
  cover_charge: event.cover_charge,
  courtesy: optionalToNull(event.courtesy),
  promo: optionalToNull(event.promo),
  slug: optionalToNull(event.slug),
}));

const musicStyleRows: Row[] = MUSIC_STYLES.map((style) => ({
  id: style.id,
  name: style.name,
  emoji: style.emoji,
}));

const notificationRows: Row[] = NOTIFICATIONS.map((notification) => ({
  id: notification.id,
  title: notification.title,
  body: notification.body,
  type: notification.type,
  created_at: isoToOffset(notification.created_at),
  read: notification.read,
  event_id: optionalToNull(notification.event_id),
  establishment_id: optionalToNull(notification.establishment_id),
}));

const attractionRows: Row[] = EVENT_ATTRACTIONS.map((attraction) => ({
  id: attraction.id,
  event_id: attraction.event_id,
  name: attraction.name,
  position: attraction.position,
}));

const TABLE_ROWS: Record<string, Row[]> = {
  cities: cityRows,
  establishments: establishmentRows,
  events: eventRows,
  event_attractions: attractionRows,
  music_styles: musicStyleRows,
  notifications: notificationRows,
};

/** Erro no formato PostgrestError que o builder fake injeta quando solicitado. */
type FakeError = { message: string; details: string; hint: string; code: string };

/**
 * Builder encadeável mínimo replicando o subset do PostgREST que a query layer
 * usa: select (ignora as colunas, devolve as rows inteiras das fixtures), eq,
 * order e maybeSingle. É thenable: `await query` resolve `{ data, error }`.
 * Quando `injectedError` é fornecido, resolve `{ data: null, error }` em ambos
 * os caminhos (lista e maybeSingle) para cobrir a propagação de erro do core.
 */
function createQueryBuilder(rows: Row[], injectedError: FakeError | null = null) {
  let current = [...rows];

  const builder = {
    select() {
      return builder;
    },
    eq(column: string, value: unknown) {
      current = current.filter((row) => row[column] === value);
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      const ascending = options?.ascending ?? true;
      current = [...current].sort((a, b) => {
        const left = Date.parse(String(a[column]));
        const right = Date.parse(String(b[column]));
        return ascending ? left - right : right - left;
      });
      return builder;
    },
    async maybeSingle() {
      if (injectedError) {
        return { data: null, error: injectedError };
      }
      return { data: current[0] ?? null, error: null };
    },
    then<TResult>(
      onFulfilled: (
        value: { data: Row[] | null; error: FakeError | null },
      ) => TResult,
    ): Promise<TResult> {
      if (injectedError) {
        return Promise.resolve(onFulfilled({ data: null, error: injectedError }));
      }
      return Promise.resolve(onFulfilled({ data: current, error: null }));
    },
  };

  return builder;
}

/**
 * Cria o client fake. `errorsByTable` injeta um erro do PostgREST na query da
 * tabela indicada; as demais tabelas seguem o caminho feliz.
 */
function createFakeClient(errorsByTable: Record<string, FakeError> = {}) {
  return {
    from(table: string) {
      const rows = TABLE_ROWS[table];
      if (!rows) {
        throw new Error(`fake client: tabela desconhecida "${table}"`);
      }
      return createQueryBuilder(rows, errorsByTable[table] ?? null);
    },
  };
}

const POSTGREST_ERROR: FakeError = {
  message: 'boom',
  details: '',
  hint: '',
  code: '42P01',
};

describe('catalog service — caminho Supabase (client fake)', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(createFakeClient());
  });

  describe('listEvents', () => {
    it('retorna os 12 eventos', async () => {
      const events = await listEvents();
      expect(events).toHaveLength(12);
    });

    it('retorna ordenado por starts_at asc', async () => {
      const events = await listEvents();
      expect(isSortedAscByStartsAt(events)).toBe(true);
    });

    it('valida com Zod mesmo com timestamps com offset', async () => {
      const events = await listEvents();
      expect(() => z.array(eventSchema).parse(events)).not.toThrow();
      expect(events.every((event) => event.starts_at.endsWith('+00:00'))).toBe(
        true,
      );
    });
  });

  describe('getEvent', () => {
    it('retorna o evento pelo id via maybeSingle', async () => {
      const event = await getEvent('ev1');
      expect(event).not.toBeNull();
      expect(event?.id).toBe('ev1');
      expect(event?.name).toBe('Samba na Varanda');
      expect(() => eventSchema.parse(event)).not.toThrow();
    });

    it('retorna null para id inexistente via maybeSingle', async () => {
      await expect(getEvent('nao-existe')).resolves.toBeNull();
    });
  });

  describe('listEstablishments', () => {
    it('retorna os 8 estabelecimentos sem filtro', async () => {
      const establishments = await listEstablishments();
      expect(establishments).toHaveLength(8);
    });

    it("filtra por cityId: 'fln' retorna 4 estabelecimentos", async () => {
      const establishments = await listEstablishments('fln');
      expect(establishments).toHaveLength(4);
      expect(establishments.every((item) => item.city_id === 'fln')).toBe(true);
    });

    it('retorna lista vazia para cityId sem estabelecimentos', async () => {
      await expect(listEstablishments('nao-existe')).resolves.toEqual([]);
    });

    it('mapeia null→undefined em instagram ausente', async () => {
      const establishments = await listEstablishments();
      const semInstagram = establishments.find((item) => item.id === 'e7');
      expect(semInstagram).toBeDefined();
      expect(semInstagram?.instagram).toBeUndefined();
      expect(semInstagram?.instagram).not.toBeNull();
    });

    it('passa na validação Zod', async () => {
      const establishments = await listEstablishments();
      expect(() =>
        z.array(establishmentSchema).parse(establishments),
      ).not.toThrow();
    });
  });

  describe('getEstablishment', () => {
    it('retorna o estabelecimento pelo id', async () => {
      const establishment = await getEstablishment('e1');
      expect(establishment).not.toBeNull();
      expect(establishment?.name).toBe('Boteco do Zé');
      expect(() => establishmentSchema.parse(establishment)).not.toThrow();
    });

    it('retorna null para id inexistente', async () => {
      await expect(getEstablishment('nao-existe')).resolves.toBeNull();
    });
  });

  describe('listEventsByEstablishment', () => {
    it("retorna ev1 e ev11 para 'e1', ordenado por starts_at asc", async () => {
      const events = await listEventsByEstablishment('e1');
      expect(events.map((event) => event.id)).toEqual(['ev1', 'ev11']);
      expect(isSortedAscByStartsAt(events)).toBe(true);
    });

    it('retorna lista vazia para estabelecimento inexistente', async () => {
      await expect(listEventsByEstablishment('nao-existe')).resolves.toEqual([]);
    });

    it('mapeia null→undefined em campos opcionais do evento', async () => {
      const events = await listEventsByEstablishment('e1');
      const ev1 = events.find((event) => event.id === 'ev1');
      expect(ev1).toBeDefined();
      expect(ev1?.promo).toBeUndefined();
      expect(ev1?.slug).toBeUndefined();
    });
  });

  describe('listMusicStyles', () => {
    it('retorna os 10 estilos validados pelo Zod', async () => {
      const styles = await listMusicStyles();
      expect(styles).toHaveLength(10);
      expect(() => z.array(musicStyleSchema).parse(styles)).not.toThrow();
    });
  });

  describe('listCities', () => {
    it('retorna as 6 cidades validadas pelo Zod', async () => {
      const cities = await listCities();
      expect(cities).toHaveLength(6);
      expect(() => z.array(citySchema).parse(cities)).not.toThrow();
    });
  });

  describe('listNotifications', () => {
    it('retorna as 4 notificações', async () => {
      const notifications = await listNotifications();
      expect(notifications).toHaveLength(4);
    });

    it('retorna ordenado por created_at desc', async () => {
      const notifications = await listNotifications();
      const timestamps = notifications.map((item) =>
        Date.parse(item.created_at),
      );
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it('valida com Zod e mapeia null→undefined em event_id ausente', async () => {
      const notifications = await listNotifications();
      expect(() =>
        z.array(notificationSchema).parse(notifications),
      ).not.toThrow();
      const n4 = notifications.find((item) => item.id === 'n4');
      expect(n4).toBeDefined();
      expect(n4?.event_id).toBeUndefined();
    });
  });

  describe('listEventAttractions', () => {
    it('retorna atrações do evento ordenadas por position', async () => {
      const result = await listEventAttractions('ev1');
      expect(result.map((a) => a.id)).toEqual(['att1', 'att2']);
      expect(result.every((a) => a.event_id === 'ev1')).toBe(true);
    });

    it('retorna [] para evento sem atrações', async () => {
      const result = await listEventAttractions('inexistente');
      expect(result).toEqual([]);
    });
  });

  describe('propagação de erro do PostgREST', () => {
    it('listEvents rejeita quando a query de events retorna error', async () => {
      mockGetSupabase.mockReturnValue(
        createFakeClient({ events: POSTGREST_ERROR }),
      );
      await expect(listEvents()).rejects.toEqual(POSTGREST_ERROR);
    });

    it('listEstablishments rejeita quando a query de establishments retorna error', async () => {
      mockGetSupabase.mockReturnValue(
        createFakeClient({ establishments: POSTGREST_ERROR }),
      );
      await expect(listEstablishments()).rejects.toEqual(POSTGREST_ERROR);
    });

    it('getEvent rejeita quando maybeSingle retorna error (≠ não encontrado)', async () => {
      mockGetSupabase.mockReturnValue(
        createFakeClient({ events: POSTGREST_ERROR }),
      );
      await expect(getEvent('ev1')).rejects.toEqual(POSTGREST_ERROR);
    });

    it('listEventAttractions rejeita quando a query de event_attractions retorna error', async () => {
      mockGetSupabase.mockReturnValue(
        createFakeClient({ event_attractions: POSTGREST_ERROR }),
      );
      await expect(listEventAttractions('ev1')).rejects.toEqual(POSTGREST_ERROR);
    });
  });
});
