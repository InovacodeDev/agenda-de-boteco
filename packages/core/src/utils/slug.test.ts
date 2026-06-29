import { generateId, slugify } from './slug';

describe('slugify', () => {
  it('retorna string', () => {
    expect(typeof slugify('Bar do Zé')).toBe('string');
  });

  it('minúsculas e remove acentos', () => {
    expect(slugify('Bar do Zé!')).toBe('bar-do-ze');
    expect(slugify('Açaí na Praça')).toBe('acai-na-praca');
  });

  it('troca símbolos por hífen e colapsa', () => {
    expect(slugify('Boteco @ Centro & Cia')).toBe('boteco-centro-cia');
  });

  it('colapsa espaços múltiplos', () => {
    expect(slugify('Bar    do    Zé')).toBe('bar-do-ze');
  });

  it('apara hífens das pontas', () => {
    expect(slugify('  !Bar!  ')).toBe('bar');
    expect(slugify('---Zé---')).toBe('ze');
  });

  it('string sem alfanuméricos vira vazia', () => {
    expect(slugify('!@#$')).toBe('');
  });
});

describe('generateId', () => {
  it('retorna string', () => {
    expect(typeof generateId('Bar do Zé')).toBe('string');
  });

  it('gera slug quando não há colisão', () => {
    expect(generateId('Bar do Zé', [])).toBe('bar-do-ze');
    expect(generateId('Bar do Zé', ['outro'])).toBe('bar-do-ze');
  });

  it('sufixa -2 na primeira colisão', () => {
    expect(generateId('Bar do Zé', ['bar-do-ze'])).toBe('bar-do-ze-2');
  });

  it('avança até o primeiro sufixo livre', () => {
    expect(
      generateId('Bar do Zé', ['bar-do-ze', 'bar-do-ze-2', 'bar-do-ze-3']),
    ).toBe('bar-do-ze-4');
  });
});
