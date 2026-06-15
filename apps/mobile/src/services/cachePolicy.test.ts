/**
 * cachePolicy é um util PURO com lógica de decisão (allowlist + status) →
 * exige teste. O contrato travado aqui: persistir SOMENTE queries 'success'
 * cujo primeiro segmento esteja no catálogo. Qualquer refactor deve manter
 * exatamente estas decisões (regressão estrutural e de valor).
 */
import { type Query, type QueryKey } from '@tanstack/react-query';

import { CACHE_BUSTER, shouldDehydrateQuery } from './cachePolicy';

/**
 * Fixture tipada: monta o subconjunto de `Query` que `shouldDehydrateQuery`
 * realmente lê (queryKey + state.status), encapsulando o cast num único ponto
 * para não vazar `any`/`unknown` para os testes.
 */
function makeQuery(queryKey: QueryKey, status: Query['state']['status']): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe('shouldDehydrateQuery', () => {
  const allowlist = [
    'events',
    'establishments',
    'music-styles',
    'cities',
    'notifications',
  ] as const;

  it.each(allowlist)(
    'aceita query success com primeiro segmento "%s"',
    (segment) => {
      expect(shouldDehydrateQuery(makeQuery([segment], 'success'))).toBe(true);
    },
  );

  it('aceita keys hierárquicas que começam com segmento do catálogo', () => {
    expect(
      shouldDehydrateQuery(makeQuery(['events', 'detail', 'ev1'], 'success')),
    ).toBe(true);
    expect(
      shouldDehydrateQuery(
        makeQuery(['establishments', 'list', 'fln'], 'success'),
      ),
    ).toBe(true);
    expect(
      shouldDehydrateQuery(
        makeQuery(['events', 'by-establishment', 'e1'], 'success'),
      ),
    ).toBe(true);
  });

  it('rejeita status pending mesmo com key do catálogo', () => {
    expect(shouldDehydrateQuery(makeQuery(['events'], 'pending'))).toBe(false);
  });

  it('rejeita status error mesmo com key do catálogo', () => {
    expect(shouldDehydrateQuery(makeQuery(['cities'], 'error'))).toBe(false);
  });

  it('rejeita key cujo primeiro segmento não está no allowlist', () => {
    expect(shouldDehydrateQuery(makeQuery(['auth'], 'success'))).toBe(false);
    expect(shouldDehydrateQuery(makeQuery(['location'], 'success'))).toBe(false);
    expect(
      shouldDehydrateQuery(makeQuery(['session', 'current'], 'success')),
    ).toBe(false);
  });

  it('rejeita key vazia', () => {
    expect(shouldDehydrateQuery(makeQuery([], 'success'))).toBe(false);
  });

  it('rejeita primeiro segmento não-string mesmo que coincida por coerção', () => {
    expect(shouldDehydrateQuery(makeQuery([123], 'success'))).toBe(false);
  });
});

describe('CACHE_BUSTER', () => {
  it('é string não-vazia', () => {
    expect(typeof CACHE_BUSTER).toBe('string');
    expect(CACHE_BUSTER.length).toBeGreaterThan(0);
  });
});
