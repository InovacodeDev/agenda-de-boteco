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
  getCatalogCounts,
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
      const page = await listEvents();
      expect(page.items).toHaveLength(Math.min(12, 20));
    });

    it('retorna ordenado por starts_at asc', async () => {
      const page = await listEvents();
      expect(isSortedAscByStartsAt(page.items)).toBe(true);
    });

    it('passa na validação Zod', async () => {
      const page = await listEvents();
      expect(() => z.array(eventSchema).parse(page.items)).not.toThrow();
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

    // Regressão, mesmo caso de logo_url/cover_url: o banner é opcional no
    // formulário do dono e a coluna é NOT NULL, então um evento sem imagem
    // grava ''. Exigir URL gravava o evento e quebrava a leitura dele.
    it('aceita banner_url vazio (evento salvo sem banner)', async () => {
      const semBanner = { ...(await getEvent('ev1')), banner_url: '' };
      expect(() => eventSchema.parse(semBanner)).not.toThrow();

      expect(() =>
        eventSchema.parse({ ...semBanner, banner_url: 'nao-e-url' }),
      ).toThrow();
    });
  });

  describe('listEstablishments', () => {
    it('retorna os 8 estabelecimentos do mock sem filtro', async () => {
      const page = await listEstablishments();
      expect(page.items).toHaveLength(Math.min(8, 20));
    });

    it("filtra por cityId: 'fln' retorna 4 estabelecimentos", async () => {
      const page = await listEstablishments('fln');
      expect(page.items).toHaveLength(Math.min(4, 20));
      expect(page.items.every((item) => item.city_id === 'fln')).toBe(true);
    });

    it('retorna lista vazia para cityId sem estabelecimentos', async () => {
      const page = await listEstablishments('nao-existe');
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it('passa na validação Zod', async () => {
      const page = await listEstablishments();
      expect(() =>
        z.array(establishmentSchema).parse(page.items),
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
      const page = await listEventsByEstablishment('e1');
      expect(page.items.map((event) => event.id)).toEqual(['ev1', 'ev11']);
      expect(isSortedAscByStartsAt(page.items)).toBe(true);
    });

    it('retorna lista vazia para estabelecimento inexistente', async () => {
      const page = await listEventsByEstablishment('nao-existe');
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
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
      const page = await listNotifications();
      expect(page.items).toHaveLength(Math.min(4, 20));
    });

    it('retorna ordenado por created_at desc', async () => {
      const page = await listNotifications();
      const timestamps = page.items.map((item) => Date.parse(item.created_at));
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it('passa na validação Zod', async () => {
      const page = await listNotifications();
      expect(() =>
        z.array(notificationSchema).parse(page.items),
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

  describe('getCatalogCounts', () => {
    it('conta os arrays mock locais', async () => {
      const counts = await getCatalogCounts();
      expect(counts).toEqual({
        establishments: ESTABLISHMENTS.length,
        events: EVENTS.length,
        notifications: NOTIFICATIONS.length,
      });
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
  const orderClauses: { column: string; ascending: boolean }[] = [];

  const builder = {
    select() {
      return builder;
    },
    eq(column: string, value: unknown) {
      current = current.filter((row) => row[column] === value);
      return builder;
    },
    gt(column: string, value: unknown) {
      current = current.filter((row) => String(row[column]) > String(value));
      return builder;
    },
    lt(column: string, value: unknown) {
      current = current.filter((row) => String(row[column]) < String(value));
      return builder;
    },
    /**
     * Suporte mínimo ao `.or()` do PostgREST no formato que a paginação por
     * cursor usa: `col.gt."valor",and(col.eq."valor",id.gt."valor")`. Valores
     * sempre citados (quoteCursorValue) — unquote reverte `\"`/`\\` antes de
     * comparar. Só o suficiente para o teste — não é um parser geral de filtro.
     */
    or(expression: string) {
      const pattern = new RegExp(
        '^(\\w+)\\.(gt|lt)\\."((?:[^"\\\\]|\\\\.)*)",and\\(\\1\\.eq\\."((?:[^"\\\\]|\\\\.)*)",id\\.(?:gt|lt)\\."((?:[^"\\\\]|\\\\.)*)"\\)$',
      );
      const match = pattern.exec(expression);
      if (!match) {
        throw new Error(`fake builder: expressao .or() nao suportada: ${expression}`);
      }
      const unquote = (v: string) => v.replace(/\\(.)/g, '$1');
      const [, column, operator, rawPrimary, rawTie, rawTieId] = match;
      const primary = unquote(rawPrimary);
      const tie = unquote(rawTie);
      const tieId = unquote(rawTieId);
      current = current.filter((row) => {
        const value = String(row[column]);
        const beyond = operator === 'gt' ? value > primary : value < primary;
        if (beyond) return true;
        const tieBreak = operator === 'gt' ? String(row.id) > tieId : String(row.id) < tieId;
        return value === tie && tieBreak;
      });
      return builder;
    },
    limit(count: number) {
      current = current.slice(0, count);
      return builder;
    },
    /**
     * PostgREST encadeia .order() em ordem de prioridade (primeira chamada é o
     * critério primário, chamadas seguintes so desempatam). Por isso acumula
     * as clausulas em vez de re-ordenar do zero a cada chamada — sobrescrever
     * descartaria o criterio primario (ex.: starts_at) ao aplicar o de
     * desempate (id).
     */
    order(column: string, options?: { ascending?: boolean }) {
      orderClauses.push({ column, ascending: options?.ascending ?? true });
      current = [...current].sort((a, b) => {
        for (const clause of orderClauses) {
          const rawLeft = a[clause.column];
          const rawRight = b[clause.column];
          const left = Date.parse(String(rawLeft));
          const right = Date.parse(String(rawRight));
          // Colunas nao-data (name, id) caem no comparador de string.
          const cmp =
            Number.isNaN(left) || Number.isNaN(right)
              ? String(rawLeft).localeCompare(String(rawRight))
              : left - right;
          if (cmp !== 0) {
            return clause.ascending ? cmp : -cmp;
          }
        }
        return 0;
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
 * Fake mínimo de `.rpc(name).single()` para get_catalog_counts: resolve
 * `{ data, error }` direto, sem builder encadeável — a query layer só chama
 * `.single()` em cima do `.rpc()`.
 */
function createRpcBuilder(row: Row, injectedError: FakeError | null = null) {
  return {
    async single() {
      if (injectedError) {
        return { data: null, error: injectedError };
      }
      return { data: row, error: null };
    },
  };
}

/**
 * Cria o client fake. `errorsByTable` injeta um erro do PostgREST na query da
 * tabela indicada; as demais tabelas seguem o caminho feliz. `rpcError`, se
 * fornecido, é devolvido por qualquer chamada a `.rpc()`.
 */
function createFakeClient(
  errorsByTable: Record<string, FakeError> = {},
  rpcError: FakeError | null = null,
) {
  return {
    from(table: string) {
      const rows = TABLE_ROWS[table];
      if (!rows) {
        throw new Error(`fake client: tabela desconhecida "${table}"`);
      }
      return createQueryBuilder(rows, errorsByTable[table] ?? null);
    },
    rpc(_name: string) {
      return createRpcBuilder(
        {
          establishments_count: establishmentRows.length,
          events_count: eventRows.length,
          notifications_count: notificationRows.length,
        },
        rpcError,
      );
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
      const page = await listEvents();
      expect(page.items).toHaveLength(Math.min(12, 20));
    });

    it('retorna ordenado por starts_at asc', async () => {
      const page = await listEvents();
      expect(isSortedAscByStartsAt(page.items)).toBe(true);
    });

    it('valida com Zod mesmo com timestamps com offset', async () => {
      const page = await listEvents();
      expect(() => z.array(eventSchema).parse(page.items)).not.toThrow();
      expect(
        page.items.every((event) => event.starts_at.endsWith('+00:00')),
      ).toBe(true);
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
      const page = await listEstablishments();
      expect(page.items).toHaveLength(Math.min(8, 20));
    });

    it("filtra por cityId: 'fln' retorna 4 estabelecimentos", async () => {
      const page = await listEstablishments('fln');
      expect(page.items).toHaveLength(Math.min(4, 20));
      expect(page.items.every((item) => item.city_id === 'fln')).toBe(true);
    });

    it('retorna lista vazia para cityId sem estabelecimentos', async () => {
      const page = await listEstablishments('nao-existe');
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it('mapeia null→undefined em instagram ausente', async () => {
      const page = await listEstablishments();
      const semInstagram = page.items.find((item) => item.id === 'e7');
      expect(semInstagram).toBeDefined();
      expect(semInstagram?.instagram).toBeUndefined();
      expect(semInstagram?.instagram).not.toBeNull();
    });

    it('passa na validação Zod mesmo com logo_url e cover_url vazios', () => {
      const base = ESTABLISHMENTS[0];
      const parsed = establishmentSchema.parse({
        ...base,
        logo_url: '',
        cover_url: '',
        menu_photo_urls: ['relative/path.png'],
      });
      expect(parsed.logo_url).toBe('');
      expect(parsed.cover_url).toBe('');
      expect(parsed.menu_photo_urls).toEqual(['relative/path.png']);
    });

    it('passa na validação Zod', async () => {
      const page = await listEstablishments();
      expect(() =>
        z.array(establishmentSchema).parse(page.items),
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
      const page = await listEventsByEstablishment('e1');
      expect(page.items.map((event) => event.id)).toEqual(['ev1', 'ev11']);
      expect(isSortedAscByStartsAt(page.items)).toBe(true);
    });

    it('retorna lista vazia para estabelecimento inexistente', async () => {
      const page = await listEventsByEstablishment('nao-existe');
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });

    it('mapeia null→undefined em campos opcionais do evento', async () => {
      const page = await listEventsByEstablishment('e1');
      const ev1 = page.items.find((event) => event.id === 'ev1');
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
      const page = await listNotifications();
      expect(page.items).toHaveLength(Math.min(4, 20));
    });

    it('retorna ordenado por created_at desc', async () => {
      const page = await listNotifications();
      const timestamps = page.items.map((item) => Date.parse(item.created_at));
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it('valida com Zod e mapeia null→undefined em event_id ausente', async () => {
      const page = await listNotifications();
      expect(() =>
        z.array(notificationSchema).parse(page.items),
      ).not.toThrow();
      const n4 = page.items.find((item) => item.id === 'n4');
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

  describe('getCatalogCounts', () => {
    it('chama get_catalog_counts e mapeia as 3 colunas', async () => {
      const counts = await getCatalogCounts();
      expect(counts).toEqual({
        establishments: establishmentRows.length,
        events: eventRows.length,
        notifications: notificationRows.length,
      });
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

    it('getCatalogCounts rejeita quando get_catalog_counts retorna error', async () => {
      mockGetSupabase.mockReturnValue(createFakeClient({}, POSTGREST_ERROR));
      await expect(getCatalogCounts()).rejects.toEqual(POSTGREST_ERROR);
    });
  });
});

describe('paginacao por cursor', () => {
  beforeEach(() => {
    mockGetSupabase.mockReturnValue(createFakeClient());
  });

  it('respeita o limite pedido na primeira pagina', async () => {
    const page = await listEvents(null, 2);

    expect(page.items).toHaveLength(2);
  });

  it('devolve nextCursor quando ainda ha itens', async () => {
    const page = await listEvents(null, 2);

    expect(page.nextCursor).not.toBeNull();
  });

  it('devolve nextCursor null quando a pagina nao enche', async () => {
    const page = await listEvents(null, 999);

    expect(page.nextCursor).toBeNull();
  });

  it('a segunda pagina nao repete itens da primeira', async () => {
    const first = await listEvents(null, 2);
    const second = await listEvents(first.nextCursor, 2);

    const firstIds = first.items.map((item) => item.id);
    const secondIds = second.items.map((item) => item.id);

    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('pagina o mock quando nao ha client configurado', async () => {
    mockGetSupabase.mockReturnValue(null);

    const first = await listEvents(null, 1);
    const second = await listEvents(first.nextCursor, 1);

    expect(first.items).toHaveLength(1);
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it('listEstablishments pagina por cursor sem repetir itens', async () => {
    const first = await listEstablishments(undefined, null, 3);
    const second = await listEstablishments(undefined, first.nextCursor, 3);

    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).not.toBeNull();

    const firstIds = first.items.map((item) => item.id);
    const secondIds = second.items.map((item) => item.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
  });

  it('listEstablishments rejeita quando a pagina paginada retorna error do Postgrest', async () => {
    mockGetSupabase.mockReturnValue(
      createFakeClient({ establishments: POSTGREST_ERROR }),
    );
    await expect(listEstablishments(undefined, null, 3)).rejects.toEqual(
      POSTGREST_ERROR,
    );
  });

  it('listEstablishments pagina ate o fim quando o nome do bar tem virgula/parenteses', async () => {
    // Regressao: decodeCursor rejeitava virgula/parenteses no valor do cursor,
    // fazendo a query layer tratar "Bar do Ze, Cia (Centro)" como cursor
    // invalido — reiniciava a pagina 1 pra sempre em vez de avancar. Fix:
    // quoteCursorValue cita o valor no .or() do PostgREST em vez de rejeitar.
    const base = establishmentRows[0];
    const commaRows: Row[] = [
      { ...base, id: 'e-comma-1', name: 'Ana Bar' },
      { ...base, id: 'e-comma-2', name: 'Bar do Ze, Cia (Centro)' },
      { ...base, id: 'e-comma-3', name: 'Zeta Pub' },
    ];
    mockGetSupabase.mockReturnValue({
      from(table: string) {
        if (table !== 'establishments') {
          throw new Error(`fake client: tabela desconhecida "${table}"`);
        }
        return createQueryBuilder(commaRows);
      },
    });

    const first = await listEstablishments(undefined, null, 1);
    expect(first.items.map((item) => item.id)).toEqual(['e-comma-1']);
    expect(first.nextCursor).not.toBeNull();

    const second = await listEstablishments(undefined, first.nextCursor, 1);
    expect(second.items.map((item) => item.id)).toEqual(['e-comma-2']);
    expect(second.nextCursor).not.toBeNull();

    const third = await listEstablishments(undefined, second.nextCursor, 1);
    expect(third.items.map((item) => item.id)).toEqual(['e-comma-3']);

    // limit=1 e exatamente 1 item restante: a pagina vem cheia, entao
    // nextCursor so vira null no round-trip seguinte (comportamento padrao de
    // keyset pagination, nao um bug do teste).
    const fourth = await listEstablishments(undefined, third.nextCursor, 1);
    expect(fourth.items).toEqual([]);
    expect(fourth.nextCursor).toBeNull();
  });
});
