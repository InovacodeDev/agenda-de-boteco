import { scaleFontSize } from './responsiveType';

describe('scaleFontSize', () => {
  it('mantém o tamanho base em "md"', () => {
    expect(scaleFontSize(24, 'md')).toBe(24);
    expect(scaleFontSize(14, 'md')).toBe(14);
  });

  it('reduz ~8% em "sm" com arredondamento', () => {
    expect(scaleFontSize(24, 'sm')).toBe(22);
    expect(scaleFontSize(28, 'sm')).toBe(26);
  });

  it('aumenta ~8% em "lg" com arredondamento', () => {
    expect(scaleFontSize(24, 'lg')).toBe(26);
    expect(scaleFontSize(28, 'lg')).toBe(30);
  });

  it('aplica clamp mínimo de 12', () => {
    expect(scaleFontSize(12, 'sm')).toBe(12);
    expect(scaleFontSize(11, 'sm')).toBe(12);
  });

  it('sempre retorna number', () => {
    expect(typeof scaleFontSize(20, 'lg')).toBe('number');
  });
});
