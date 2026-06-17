import { ESTABLISHMENTS, EVENTS } from '../data/mock';
import type { Establishment, Event } from '../data/schemas';
import {
  applyEventFilters,
  DEFAULT_EVENT_FILTERS,
  type EventFilterContext,
  type EventFilters,
  normalizeText,
} from './filters';

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
});
