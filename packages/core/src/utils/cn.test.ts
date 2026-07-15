import { cn } from './cn';

describe('cn', () => {
  it('concatena classes simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignora valores falsy e aplica objetos condicionais (clsx)', () => {
    expect(cn('a', false, undefined, null, { c: true, d: false })).toBe('a c');
  });

  it('aceita arrays aninhados', () => {
    expect(cn(['a', ['b', { c: true }]])).toBe('a b c');
  });

  it('resolve conflitos do Tailwind mantendo a última classe (tailwind-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('px-2 py-1', 'p-3')).toBe('p-3');
  });

  it('preserva classes sem conflito', () => {
    expect(cn('flex items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('retorna string vazia sem argumentos', () => {
    expect(cn()).toBe('');
  });
});
