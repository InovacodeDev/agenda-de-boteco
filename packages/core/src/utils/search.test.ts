import { buildNameSearchPattern, MAX_SEARCH_LENGTH } from './search';

describe('buildNameSearchPattern', () => {
  it('envolve o termo em curingas de substring', () => {
    expect(buildNameSearchPattern('bar')).toBe('%b_r%');
  });

  it('devolve null para termo vazio ou só espaços', () => {
    expect(buildNameSearchPattern('')).toBeNull();
    expect(buildNameSearchPattern('   ')).toBeNull();
  });

  it('devolve null quando só sobra `*`', () => {
    expect(buildNameSearchPattern('**')).toBeNull();
  });

  it('escapa % e _ digitados pelo usuário como literais', () => {
    expect(buildNameSearchPattern('100%')).toBe('%100\\%%');
    expect(buildNameSearchPattern('x_z')).toBe('%x\\_z%');
  });

  it('escapa a barra invertida', () => {
    expect(buildNameSearchPattern('x\\z')).toBe('%x\\\\z%');
  });

  it('remove `*`, que o PostgREST converteria em curinga', () => {
    expect(buildNameSearchPattern('x*z')).toBe('%xz%');
  });

  it('mantém vírgula e parênteses literais (valor de .ilike, não de .or)', () => {
    expect(buildNameSearchPattern('x, (z)')).toBe('%x, (z)%');
  });

  it('ignora acento e caixa: termo com e sem acento gera o mesmo padrão', () => {
    expect(buildNameSearchPattern('Zé')).toBe(buildNameSearchPattern('ze'));
    expect(buildNameSearchPattern('ZÉ')).toBe('%z_%');
  });

  it('troca letras acentuáveis por curinga de um caractere (superset para o servidor)', () => {
    expect(buildNameSearchPattern('café')).toBe('%__f_%');
  });

  it('limita o termo a MAX_SEARCH_LENGTH caracteres', () => {
    const pattern = buildNameSearchPattern('x'.repeat(MAX_SEARCH_LENGTH + 30));
    expect(pattern).toBe(`%${'x'.repeat(MAX_SEARCH_LENGTH)}%`);
  });
});
