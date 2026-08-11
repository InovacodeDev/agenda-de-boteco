import { resolveBreakpoint } from './useResponsive';

describe('resolveBreakpoint', () => {
  it('retorna "sm" abaixo de 380', () => {
    expect(resolveBreakpoint(0)).toBe('sm');
    expect(resolveBreakpoint(320)).toBe('sm');
    expect(resolveBreakpoint(379)).toBe('sm');
  });

  it('retorna "md" entre 380 (inclusivo) e 768 (exclusivo)', () => {
    expect(resolveBreakpoint(380)).toBe('md');
    expect(resolveBreakpoint(414)).toBe('md');
    expect(resolveBreakpoint(767)).toBe('md');
  });

  it('retorna "lg" a partir de 768', () => {
    expect(resolveBreakpoint(768)).toBe('lg');
    expect(resolveBreakpoint(1024)).toBe('lg');
  });

  it('sempre retorna uma string do union', () => {
    const value = resolveBreakpoint(500);
    expect(['sm', 'md', 'lg']).toContain(value);
  });
});
