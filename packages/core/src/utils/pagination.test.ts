import {
  type CatalogPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  flattenPages,
} from './pagination';

describe('flattenPages', () => {
  it('devolve array vazio quando nao ha paginas', () => {
    expect(flattenPages(undefined)).toEqual([]);
  });

  it('concatena os itens de todas as paginas na ordem', () => {
    const pages: CatalogPage<{ id: string }>[] = [
      { items: [{ id: 'a' }, { id: 'b' }], nextCursor: 'cursor-1' },
      { items: [{ id: 'c' }], nextCursor: null },
    ];

    expect(flattenPages({ pages, pageParams: [null, 'cursor-1'] })).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
  });

  it('ignora paginas vazias sem quebrar', () => {
    const pages: CatalogPage<{ id: string }>[] = [{ items: [], nextCursor: null }];

    expect(flattenPages({ pages, pageParams: [null] })).toEqual([]);
  });
});

describe('cursor', () => {
  it('expoe 20 como tamanho de pagina padrao', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('faz round-trip de valor e id', () => {
    const encoded = encodeCursor({ value: '2026-09-03T20:00:00Z', id: 'evt-1' });

    expect(decodeCursor(encoded)).toEqual({ value: '2026-09-03T20:00:00Z', id: 'evt-1' });
  });

  it('decodifica null quando o cursor e nulo', () => {
    expect(decodeCursor(null)).toBeNull();
  });

  it('preserva o separador quando ele aparece dentro do valor', () => {
    const encoded = encodeCursor({ value: 'Bar do Ze | Centro', id: 'est-9' });

    expect(decodeCursor(encoded)).toEqual({ value: 'Bar do Ze | Centro', id: 'est-9' });
  });
});
