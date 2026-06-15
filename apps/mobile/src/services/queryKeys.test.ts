/**
 * queryKeys é um util com lógica (factory) → exige teste. O contrato crítico é
 * a hierarquia por prefixo: invalidar `['events']` precisa casar com detail e
 * by-establishment. Os testes travam esse contrato e a estabilidade estrutural.
 */
import { catalogKeys } from './queryKeys';

describe('catalogKeys.events', () => {
  it('root é prefixo de detail', () => {
    const root = catalogKeys.events.root;
    const detail = catalogKeys.events.detail('x');
    expect(detail.slice(0, root.length)).toEqual(root);
  });

  it('root é prefixo de byEstablishment', () => {
    const root = catalogKeys.events.root;
    const byEst = catalogKeys.events.byEstablishment('y');
    expect(byEst.slice(0, root.length)).toEqual(root);
  });

  it('detail e byEstablishment têm formato esperado', () => {
    expect(catalogKeys.events.detail('x')).toEqual(['events', 'detail', 'x']);
    expect(catalogKeys.events.byEstablishment('y')).toEqual([
      'events',
      'by-establishment',
      'y',
    ]);
  });

  it('detail é estruturalmente estável entre chamadas', () => {
    expect(catalogKeys.events.detail('x')).toEqual(
      catalogKeys.events.detail('x'),
    );
  });
});

describe('catalogKeys.establishments', () => {
  it('list com e sem cityId produzem keys distintas', () => {
    expect(catalogKeys.establishments.list('fln')).not.toEqual(
      catalogKeys.establishments.list(),
    );
  });

  it('list com cityId tem formato esperado e começa com root', () => {
    const root = catalogKeys.establishments.root;
    const withCity = catalogKeys.establishments.list('fln');
    expect(withCity).toEqual(['establishments', 'list', 'fln']);
    expect(withCity.slice(0, root.length)).toEqual(root);
  });

  it('list sem cityId tem formato esperado e começa com root', () => {
    const root = catalogKeys.establishments.root;
    const withoutCity = catalogKeys.establishments.list();
    expect(withoutCity).toEqual(['establishments', 'list']);
    expect(withoutCity.slice(0, root.length)).toEqual(root);
  });

  it('root é prefixo de detail', () => {
    const root = catalogKeys.establishments.root;
    const detail = catalogKeys.establishments.detail('e1');
    expect(detail).toEqual(['establishments', 'detail', 'e1']);
    expect(detail.slice(0, root.length)).toEqual(root);
  });

  it('detail é estruturalmente estável entre chamadas', () => {
    expect(catalogKeys.establishments.detail('e1')).toEqual(
      catalogKeys.establishments.detail('e1'),
    );
  });
});

describe('catalogKeys keys simples', () => {
  it('musicStyles tem formato esperado', () => {
    expect(catalogKeys.musicStyles).toEqual(['music-styles']);
  });

  it('cities tem formato esperado', () => {
    expect(catalogKeys.cities).toEqual(['cities']);
  });

  it('notifications tem formato esperado', () => {
    expect(catalogKeys.notifications).toEqual(['notifications']);
  });
});
