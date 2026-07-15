import { formatPrice, formatRating } from './format';

describe('formatPrice', () => {
  it('retorna Free para couvert zero', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('formata inteiros sem casas decimais', () => {
    expect(formatPrice(20)).toBe('R$ 20');
    expect(formatPrice(80)).toBe('R$ 80');
    expect(formatPrice(5)).toBe('R$ 5');
  });

  it('formata decimais com vírgula e 2 casas', () => {
    expect(formatPrice(22.5)).toBe('R$ 22,50');
    expect(formatPrice(15.75)).toBe('R$ 15,75');
    expect(formatPrice(0.5)).toBe('R$ 0,50');
  });
});

describe('formatRating', () => {
  it('formata média com 1 casa decimal e contagem entre parênteses', () => {
    expect(formatRating(4.7, 312)).toBe('4.7 (312)');
  });

  it('completa a casa decimal de inteiros', () => {
    expect(formatRating(4, 10)).toBe('4.0 (10)');
    expect(formatRating(5, 0)).toBe('5.0 (0)');
  });

  it('arredonda para 1 casa decimal', () => {
    expect(formatRating(4.75, 10)).toBe('4.8 (10)');
    expect(formatRating(4.44, 10)).toBe('4.4 (10)');
  });
});
