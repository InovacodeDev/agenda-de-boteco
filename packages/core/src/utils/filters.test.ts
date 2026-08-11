import { ESTABLISHMENTS, EVENTS } from '../data';
import type { Establishment, Event } from '../schemas';
import {
  applyEstablishmentFilters,
  applyEventFilters,
  DEFAULT_EVENT_FILTERS,
  type EventFilterContext,
  type EventFilters,
  hasActiveFilters,
  matchesAttributes,
  normalizeText,
  sortEstablishmentsByDistance,
} from './filters';
import { haversineDistanceKm } from './geo';

const ESTABLISHMENTS_BY_ID: Record<string, Establishment> = Object.fromEntries(
  ESTABLISHMENTS.map((establishment) => [establishment.id, establishment]),
);

// quinta-feira, 20:00 local
const NOW = new Date(2026, 5, 11, 20, 0, 0, 0);

function makeContext(overrides: Partial<EventFilterContext> = {}): EventFilterContext {
  return {
    now: NOW,
    cityId: 'fln',
    establishmentsById: ESTABLISHMENTS_BY_ID,
    ...overrides,
  };
}

function makeFilters(overrides: Partial<EventFilters> = {}): EventFilters {
  return { ...DEFAULT_EVENT_FILTERS, ...overrides };
}

function ids(events: Event[]): string[] {
  return events.map((event) => event.id);
}

describe('normalizeText', () => {
  it('converte para minúsculas e remove acentos', () => {
    expect(normalizeText('Florianópolis')).toBe('florianopolis');
    expect(normalizeText('SERTANEJO Universitário')).toBe('sertanejo universitario');
    expect(normalizeText('Forró')).toBe('forro');
  });
});

describe('applyEventFilters', () => {
  it('com filtros default restringe à cidade do contexto (fln → 7 eventos)', () => {
    const result = applyEventFilters(EVENTS, makeFilters(), makeContext());
    expect(result).toHaveLength(7);
    expect(new Set(ids(result))).toEqual(
      new Set(['ev1', 'ev2', 'ev3', 'ev4', 'ev9', 'ev10', 'ev11']),
    );
  });

  it('retorna ordenado por starts_at ascendente sem mutar a entrada', () => {
    const original = [...EVENTS];
    const result = applyEventFilters(EVENTS, makeFilters(), makeContext());
    const times = result.map((event) => new Date(event.starts_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(EVENTS).toEqual(original);
  });

  it('descarta eventos sem establishment conhecido', () => {
    const orphan: Event = { ...EVENTS[0], id: 'evX', establishment_id: 'desconhecido' };
    const result = applyEventFilters([orphan], makeFilters(), makeContext());
    expect(result).toHaveLength(0);
  });

  it('busca por nome, atração e bar sem sensibilidade a acentos', () => {
    const byName = applyEventFilters(
      EVENTS,
      makeFilters({ query: 'varanda' }),
      makeContext(),
    );
    expect(ids(byName)).toEqual(['ev1']);

    const byAttraction = applyEventFilters(
      EVENTS,
      makeFilters({ query: 'resenha' }),
      makeContext(),
    );
    expect(new Set(ids(byAttraction))).toEqual(new Set(['ev1', 'ev11']));

    const byBar = applyEventFilters(
      EVENTS,
      makeFilters({ query: 'boteco do zé' }),
      makeContext(),
    );
    expect(new Set(ids(byBar))).toEqual(new Set(['ev1', 'ev11']));

    const accentless = applyEventFilters(
      EVENTS,
      makeFilters({ query: 'sertanejo universitario' }),
      makeContext(),
    );
    expect(ids(accentless)).toEqual(['ev3']);
  });

  it('filtra por bucket de data com fixtures determinísticas', () => {
    // sáb 2026-06-13 é fim de semana; NOW é qui 2026-06-11
    const make = (id: string, startsAt: Date): Event => ({
      ...EVENTS[0],
      id,
      starts_at: startsAt.toISOString(),
      ends_at: startsAt.toISOString(),
    });
    const today = make('today', new Date(2026, 5, 11, 22, 0));
    const tomorrow = make('tomorrow', new Date(2026, 5, 12, 22, 0));
    const saturday = make('saturday', new Date(2026, 5, 13, 22, 0));
    const fixtures = [today, tomorrow, saturday];

    expect(
      ids(applyEventFilters(fixtures, makeFilters({ dateBucket: 'today' }), makeContext())),
    ).toEqual(['today']);
    expect(
      ids(
        applyEventFilters(fixtures, makeFilters({ dateBucket: 'tomorrow' }), makeContext()),
      ),
    ).toEqual(['tomorrow']);
    expect(
      ids(
        applyEventFilters(fixtures, makeFilters({ dateBucket: 'weekend' }), makeContext()),
      ),
    ).toEqual(['saturday']);
  });

  it('filtra por estilos (interseção não-vazia)', () => {
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ styleIds: ['samba'] }),
      makeContext(),
    );
    expect(new Set(ids(result))).toEqual(new Set(['ev1', 'ev11']));
  });

  it('filtra por avaliação mínima do establishment', () => {
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ minRating: 4.6 }),
      makeContext(),
    );
    // e1 (4.7) e e4 (4.8)
    expect(new Set(ids(result))).toEqual(new Set(['ev1', 'ev4', 'ev10', 'ev11']));
  });

  it('filtra por preço máximo e por Free', () => {
    const cheap = applyEventFilters(
      EVENTS,
      makeFilters({ maxPrice: 30 }),
      makeContext(),
    );
    expect(new Set(ids(cheap))).toEqual(new Set(['ev1', 'ev2', 'ev11']));

    const free = applyEventFilters(EVENTS, makeFilters({ freeOnly: true }), makeContext());
    expect(ids(free)).toEqual(['ev11']);
  });

  it('nearMe filtra por raio quando há localização e é no-op sem ela', () => {
    const atBotecoDoZe = { lat: -27.5915, lng: -48.5234 };
    const near = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true, maxDistanceKm: 1 }),
      makeContext({ userLocation: atBotecoDoZe }),
    );
    expect(new Set(ids(near))).toEqual(new Set(['ev1', 'ev11']));

    const withoutLocation = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true, maxDistanceKm: 1 }),
      makeContext(),
    );
    expect(withoutLocation).toHaveLength(7);
  });

  it('nearMe com nearbyEstablishmentIds faz interseção por establishment_id', () => {
    // e1 é o establishment de ev1/ev11; ao restringir o set a {e1}, só esses
    // eventos da cidade sobrevivem ao ramo de proximidade server-side.
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true }),
      makeContext({ nearbyEstablishmentIds: new Set(['e1']) }),
    );
    expect(new Set(ids(result))).toEqual(new Set(['ev1', 'ev11']));
  });

  it('nearMe com nearbyEstablishmentIds vazio remove todos os eventos', () => {
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true }),
      makeContext({ nearbyEstablishmentIds: new Set<string>() }),
    );
    expect(result).toHaveLength(0);
  });

  it('nearbyEstablishmentIds tem prioridade sobre o fallback Haversine', () => {
    // Mesmo com userLocation que excluiria por raio, o set manda quando presente.
    const far = { lat: 0, lng: 0 };
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true, maxDistanceKm: 1 }),
      makeContext({
        userLocation: far,
        nearbyEstablishmentIds: new Set(['e1']),
      }),
    );
    expect(new Set(ids(result))).toEqual(new Set(['ev1', 'ev11']));
  });

  it('nearMe sem nearbyEstablishmentIds preserva o Haversine (byte-a-byte)', () => {
    // Espelha o caso existente: ausência do set === comportamento de hoje.
    const atBotecoDoZe = { lat: -27.5915, lng: -48.5234 };
    const near = applyEventFilters(
      EVENTS,
      makeFilters({ nearMe: true, maxDistanceKm: 1 }),
      makeContext({ userLocation: atBotecoDoZe }),
    );
    expect(new Set(ids(near))).toEqual(new Set(['ev1', 'ev11']));
  });

  it('openNow usa o horário do establishment (qui 20:00)', () => {
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ openNow: true }),
      makeContext(),
    );
    // e1 Ter-Dom 17h-01h ✓, e2 Qua-Sáb 19h-03h ✓, e4 Ter-Sáb 19h-00h ✓, e3 Sex-Sáb 22h-05h ✗
    expect(new Set(ids(result))).toEqual(
      new Set(['ev1', 'ev2', 'ev4', 'ev9', 'ev10', 'ev11']),
    );
  });

  describe('dateRange (precede dateBucket)', () => {
    // buildEventDate usa new Date() como base, então as datas dos eventos são
    // relativas ao dia de execução. Calculamos o intervalo cobrindo offset 1..7
    // (eventos ev3, ev4, ev9, ev10, ev11 de fln) para ter resultados não-vazios.
    function isoDate(daysOffset: number): string {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().slice(0, 10);
    }

    it('filtra eventos cujo starts_at cai dentro do intervalo, inclusivo', () => {
      const range = { start: isoDate(1), end: isoDate(7) };
      const result = applyEventFilters(
        EVENTS,
        makeFilters({ dateRange: range }),
        makeContext(),
      );
      for (const ev of result) {
        const d = new Date(ev.starts_at);
        expect(d >= new Date(`${range.start}T00:00:00`)).toBe(true);
        expect(d <= new Date(`${range.end}T23:59:59.999`)).toBe(true);
      }
    });

    it('quando dateRange está setado, dateBucket é ignorado', () => {
      const range = { start: isoDate(1), end: isoDate(7) };
      const withBucket = applyEventFilters(
        EVENTS,
        makeFilters({ dateBucket: 'today', dateRange: range }),
        makeContext(),
      );
      const onlyRange = applyEventFilters(
        EVENTS,
        makeFilters({ dateBucket: 'any', dateRange: range }),
        makeContext(),
      );
      expect(ids(withBucket)).toEqual(ids(onlyRange));
    });
  });

  describe('sortBy', () => {
    it("'date' (default) ordena por starts_at asc — regressão preservada", () => {
      const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'date' }), makeContext());
      const times = result.map((e) => new Date(e.starts_at).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });

    it("'price' ordena por cover_charge asc, desempate por starts_at asc", () => {
      const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'price' }), makeContext());
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].cover_charge <= result[i].cover_charge).toBe(true);
        if (result[i - 1].cover_charge === result[i].cover_charge) {
          expect(new Date(result[i - 1].starts_at).getTime() <= new Date(result[i].starts_at).getTime()).toBe(true);
        }
      }
    });

    it("'rating' ordena por rating_avg do estabelecimento desc", () => {
      const ctx = makeContext();
      const result = applyEventFilters(EVENTS, makeFilters({ sortBy: 'rating' }), ctx);
      for (let i = 1; i < result.length; i++) {
        const prev = ctx.establishmentsById[result[i - 1].establishment_id].rating_avg;
        const cur = ctx.establishmentsById[result[i].establishment_id].rating_avg;
        expect(prev >= cur).toBe(true);
      }
    });

    it("'distance' sem userLocation cai para ordenação por data", () => {
      const byDate = applyEventFilters(EVENTS, makeFilters({ sortBy: 'date' }), makeContext());
      const byDist = applyEventFilters(EVENTS, makeFilters({ sortBy: 'distance' }), makeContext());
      expect(ids(byDist)).toEqual(ids(byDate));
    });

    it("o default do feed é 'distance'", () => {
      expect(DEFAULT_EVENT_FILTERS.sortBy).toBe('distance');
    });

    it("'distance' com userLocation ordena os eventos do mais perto ao mais longe", () => {
      const atBotecoDoZe = { lat: -27.5915, lng: -48.5234 };
      const result = applyEventFilters(
        EVENTS,
        makeFilters({ sortBy: 'distance' }),
        makeContext({ userLocation: atBotecoDoZe }),
      );
      const distances = result.map((event) => {
        const establishment = ESTABLISHMENTS_BY_ID[event.establishment_id];
        return haversineDistanceKm(atBotecoDoZe, {
          lat: establishment.lat,
          lng: establishment.lng,
        });
      });
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    });
  });

  describe('sortEstablishmentsByDistance', () => {
    const atBotecoDoZe = { lat: -27.5915, lng: -48.5234 };

    it('ordena do mais perto ao mais longe', () => {
      const result = sortEstablishmentsByDistance(ESTABLISHMENTS, atBotecoDoZe);
      const distances = result.map((e) =>
        haversineDistanceKm(atBotecoDoZe, { lat: e.lat, lng: e.lng }),
      );
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
    });

    it('sem origin preserva a ordem recebida e não muta a entrada', () => {
      const original = [...ESTABLISHMENTS];
      const result = sortEstablishmentsByDistance(ESTABLISHMENTS, null);
      expect(result.map((e) => e.id)).toEqual(original.map((e) => e.id));
      expect(ESTABLISHMENTS).toEqual(original);
    });

    it('não muta a entrada ao ordenar', () => {
      const original = ESTABLISHMENTS.map((e) => e.id);
      sortEstablishmentsByDistance(ESTABLISHMENTS, atBotecoDoZe);
      expect(ESTABLISHMENTS.map((e) => e.id)).toEqual(original);
    });
  });

  describe('cidade virtual (geo:)', () => {
    const virtualCtx = makeContext({ cityId: 'geo:-27.595,-48.548' });

    it('ignora o recorte por cidade: sem nearMe, considera eventos de todas as cidades', () => {
      // Com cidade virtual e sem nearMe, o recorte por cidade não se aplica →
      // vêm mais eventos do que o recorte estrito de fln (que limita a 1 cidade).
      const virtual = applyEventFilters(EVENTS, makeFilters(), virtualCtx);
      const catalog = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'fln' }));
      expect(virtual.length).toBeGreaterThan(catalog.length);
    });

    it('com nearMe + nearbyEstablishmentIds, recorta só pela proximidade', () => {
      const nearbyEstablishmentIds = new Set(['e1']);
      const result = applyEventFilters(
        EVENTS,
        makeFilters({ nearMe: true }),
        makeContext({ cityId: 'geo:-27.595,-48.548', nearbyEstablishmentIds }),
      );
      // Só eventos do establishment e1 sobrevivem, independentemente da cidade.
      expect(result.every((event) => event.establishment_id === 'e1')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('descarta eventos cujo establishment não existe no índice', () => {
      const result = applyEventFilters(
        [{ ...EVENTS[0], establishment_id: 'inexistente' }],
        makeFilters(),
        virtualCtx,
      );
      expect(result).toHaveLength(0);
    });
  });

  it('cityIds vazio no contexto é idêntico ao recorte single por ctx.cityId', () => {
    const single = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'fln' }));
    const emptyMulti = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: [] }),
    );
    expect(ids(emptyMulti)).toEqual(ids(single));
  });

  it('cityIds com múltiplas cidades retorna a união dos recortes single', () => {
    const fln = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'fln' }));
    const sao = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'sao' }));
    const union = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: ['fln', 'sao'] }),
    );
    expect(new Set(ids(union))).toEqual(new Set([...ids(fln), ...ids(sao)]));
    const times = union.map((e) => new Date(e.starts_at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('cityIds presente sobrepõe ctx.cityId', () => {
    const sao = applyEventFilters(EVENTS, makeFilters(), makeContext({ cityId: 'sao' }));
    const overridden = applyEventFilters(
      EVENTS,
      makeFilters(),
      makeContext({ cityId: 'fln', cityIds: ['sao'] }),
    );
    expect(ids(overridden)).toEqual(ids(sao));
  });
});

describe('hasActiveFilters', () => {
  it('é false com os filtros default', () => {
    expect(hasActiveFilters(DEFAULT_EVENT_FILTERS)).toBe(false);
  });

  it('ignora query e sortBy (não acendem a badge)', () => {
    expect(hasActiveFilters(makeFilters({ query: 'rock' }))).toBe(false);
    expect(hasActiveFilters(makeFilters({ sortBy: 'price' }))).toBe(false);
  });

  it.each<[string, Partial<EventFilters>]>([
    ['dateBucket', { dateBucket: 'today' }],
    ['dateRange', { dateRange: { start: '2026-07-01', end: '2026-07-31' } }],
    ['styleIds', { styleIds: ['rock'] }],
    ['cityIds', { cityIds: ['sao'] }],
    ['attributeIds', { attributeIds: ['pet-friendly' as const] }],
    ['maxDistanceKm', { maxDistanceKm: 10 }],
    ['minRating', { minRating: 4 }],
    ['maxPrice', { maxPrice: 30 }],
    ['freeOnly', { freeOnly: true }],
    ['nearMe', { nearMe: true }],
    ['openNow', { openNow: true }],
  ])('é true quando %s diverge do default', (_label, override) => {
    expect(hasActiveFilters(makeFilters(override))).toBe(true);
  });
});

describe('matchesAttributes', () => {
  const e1 = ESTABLISHMENTS_BY_ID.e1;

  it('lista vazia passa qualquer estabelecimento', () => {
    expect(matchesAttributes(e1, [])).toBe(true);
  });

  it('true quando o estabelecimento tem o atributo exigido', () => {
    expect(matchesAttributes(e1, ['pet-friendly'])).toBe(true);
  });

  it('false quando falta o atributo exigido', () => {
    expect(matchesAttributes(e1, ['kids-area'])).toBe(false);
  });

  it('combina em E: exige TODOS os atributos, não qualquer um', () => {
    // e1 tem pet-friendly e outdoor-space, mas não kids-area.
    expect(matchesAttributes(e1, ['pet-friendly', 'outdoor-space'])).toBe(true);
    expect(matchesAttributes(e1, ['pet-friendly', 'kids-area'])).toBe(false);
  });
});

describe('applyEventFilters + attributeIds', () => {
  it('mantém apenas eventos de bares com o atributo', () => {
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ attributeIds: ['pet-friendly'] }),
      makeContext(),
    );
    const establishmentIds = new Set(result.map((event) => event.establishment_id));
    expect(result.length).toBeGreaterThan(0);
    for (const id of establishmentIds) {
      expect(ESTABLISHMENTS_BY_ID[id].attributes).toContain('pet-friendly');
    }
  });

  it('AND entre atributos: combinação sem bar em fln zera o feed', () => {
    // Em fln nenhum bar tem pet-friendly E kids-area — com OR sobrariam eventos.
    const result = applyEventFilters(
      EVENTS,
      makeFilters({ attributeIds: ['pet-friendly', 'kids-area'] }),
      makeContext(),
    );
    expect(result).toHaveLength(0);
  });

  it('atributos vazios não alteram o resultado default', () => {
    const withEmpty = applyEventFilters(
      EVENTS,
      makeFilters({ attributeIds: [] }),
      makeContext(),
    );
    const baseline = applyEventFilters(EVENTS, makeFilters(), makeContext());
    expect(ids(withEmpty)).toEqual(ids(baseline));
  });
});

describe('applyEstablishmentFilters', () => {
  it('sem params devolve todos, sem mutar a entrada', () => {
    const original = [...ESTABLISHMENTS];
    const result = applyEstablishmentFilters(ESTABLISHMENTS, {});
    expect(result).toHaveLength(ESTABLISHMENTS.length);
    expect(ESTABLISHMENTS).toEqual(original);
  });

  it('recorta pela cidade ativa', () => {
    const result = applyEstablishmentFilters(ESTABLISHMENTS, { cityId: 'fln' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.city_id === 'fln')).toBe(true);
  });

  it('cityIds sobrepõe a cidade ativa (união)', () => {
    const result = applyEstablishmentFilters(ESTABLISHMENTS, {
      cityId: 'fln',
      cityIds: ['sao', 'rio'],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.city_id === 'sao' || e.city_id === 'rio')).toBe(true);
  });

  it('cidade virtual não recorta (usuário fora do catálogo vê todos)', () => {
    const result = applyEstablishmentFilters(ESTABLISHMENTS, {
      cityId: 'geo:-27.5,-48.5',
    });
    expect(result).toHaveLength(ESTABLISHMENTS.length);
  });

  it('busca por nome ignora acento e caixa', () => {
    const target = ESTABLISHMENTS[0];
    const result = applyEstablishmentFilters(ESTABLISHMENTS, {
      query: target.name.toUpperCase(),
    });
    expect(result.map((e) => e.id)).toContain(target.id);
  });

  it('filtra por atributos combinados em E', () => {
    const result = applyEstablishmentFilters(ESTABLISHMENTS, {
      attributeIds: ['pet-friendly', 'kids-area'],
    });
    expect(result.length).toBeGreaterThan(0);
    for (const establishment of result) {
      expect(establishment.attributes).toContain('pet-friendly');
      expect(establishment.attributes).toContain('kids-area');
    }

    const orWouldMatch = ESTABLISHMENTS.filter(
      (e) => e.attributes.includes('pet-friendly') || e.attributes.includes('kids-area'),
    );
    expect(result.length).toBeLessThan(orWouldMatch.length);
  });

  it('ordena por proximidade quando origin é informado', () => {
    const origin = { lat: -27.5954, lng: -48.548 };
    const result = applyEstablishmentFilters(ESTABLISHMENTS, { cityId: 'fln', origin });
    const distances = result.map((e) =>
      haversineDistanceKm(origin, { lat: e.lat, lng: e.lng }),
    );
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });
});
