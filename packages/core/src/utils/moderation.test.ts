import { buildModerationExcerpt, findFlaggedTerms } from './moderation';

// Termos de placeholder de propósito: a lógica é a mesma para qualquer palavra,
// e o repositório não precisa carregar um dicionário de ofensas no histórico.
const TERMS = ['termoproibido', 'bloqueado'];

describe('findFlaggedTerms', () => {
  it('encontra o termo presente no texto', () => {
    expect(findFlaggedTerms('esse texto tem termoproibido aqui', TERMS)).toEqual([
      'termoproibido',
    ]);
  });

  it('ignora caixa alta', () => {
    expect(findFlaggedTerms('TEXTO COM TERMOPROIBIDO', TERMS)).toEqual([
      'termoproibido',
    ]);
  });

  // Quem escreve algo impróprio troca o acento; a triagem não pode cair nisso.
  it('ignora acentos no texto e no termo', () => {
    expect(findFlaggedTerms('texto com términho', ['terminho'])).toEqual(['terminho']);
    expect(findFlaggedTerms('texto com terminho', ['términho'])).toEqual(['términho']);
  });

  it('devolve todos os termos que casaram, sem repetir', () => {
    expect(
      findFlaggedTerms('termoproibido e bloqueado e termoproibido de novo', TERMS),
    ).toEqual(['termoproibido', 'bloqueado']);
  });

  // Requisito central: substring bloquearia o cadastro do dono por nada.
  it('não casa termo curto dentro de outra palavra', () => {
    expect(findFlaggedTerms('massa de pizza', ['ass'])).toEqual([]);
    expect(findFlaggedTerms('curso de coquetelaria', ['cu'])).toEqual([]);
    expect(findFlaggedTerms('bloqueadores solares', ['bloqueado'])).toEqual([]);
  });

  it('casa a palavra isolada mesmo quando ela também é substring de outra', () => {
    expect(findFlaggedTerms('tem ass e massa', ['ass'])).toEqual(['ass']);
  });

  it('tolera pontuação e separadores ao redor da palavra', () => {
    expect(findFlaggedTerms('olha: bloqueado!', TERMS)).toEqual(['bloqueado']);
    expect(findFlaggedTerms('(bloqueado)', TERMS)).toEqual(['bloqueado']);
    expect(findFlaggedTerms('bloqueado', TERMS)).toEqual(['bloqueado']);
    expect(findFlaggedTerms('linha\nbloqueado\nfim', TERMS)).toEqual(['bloqueado']);
  });

  it('aceita termo com espaço e hífen (fronteira do \\b não serviria)', () => {
    expect(findFlaggedTerms('isso é termo composto aqui', ['termo composto'])).toEqual([
      'termo composto',
    ]);
    expect(findFlaggedTerms('isso é termo-composto aqui', ['termo-composto'])).toEqual([
      'termo-composto',
    ]);
  });

  it('devolve [] para lista vazia', () => {
    expect(findFlaggedTerms('qualquer texto', [])).toEqual([]);
  });

  it('devolve [] para texto vazio', () => {
    expect(findFlaggedTerms('', TERMS)).toEqual([]);
  });

  it('ignora termos vazios ou só com espaço na lista', () => {
    expect(findFlaggedTerms('texto qualquer', ['', '   '])).toEqual([]);
  });

  it('não trata o termo como regex', () => {
    expect(findFlaggedTerms('texto qualquer', ['.*'])).toEqual([]);
  });
});

describe('buildModerationExcerpt', () => {
  it('recorta o contexto ao redor da ocorrência', () => {
    const text = `${'a'.repeat(100)} bloqueado ${'b'.repeat(100)}`;
    const excerpt = buildModerationExcerpt(text, 'bloqueado');

    expect(excerpt).toContain('bloqueado');
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThan(text.length);
  });

  it('não abre reticências à esquerda quando o termo está no começo', () => {
    const text = `bloqueado ${'b'.repeat(100)}`;
    const excerpt = buildModerationExcerpt(text, 'bloqueado');

    expect(excerpt.startsWith('bloqueado')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('não abre reticências à direita quando o termo está no fim', () => {
    const text = `${'a'.repeat(100)} bloqueado`;
    const excerpt = buildModerationExcerpt(text, 'bloqueado');

    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('bloqueado')).toBe(true);
  });

  it('devolve o texto inteiro quando ele já é curto', () => {
    expect(buildModerationExcerpt('tem bloqueado aqui', 'bloqueado')).toBe(
      'tem bloqueado aqui',
    );
  });

  // O índice vem do texto normalizado, mas o corte é no original: se os
  // comprimentos divergissem, o trecho sairia deslocado.
  it('mantém o alinhamento com texto acentuado', () => {
    const text = `${'á'.repeat(100)} bloqueado ${'ç'.repeat(100)}`;
    expect(buildModerationExcerpt(text, 'bloqueado')).toContain('bloqueado');
  });

  it('devolve o começo do texto quando o termo não aparece', () => {
    const excerpt = buildModerationExcerpt('texto sem nada demais', 'bloqueado');
    expect(excerpt.startsWith('texto sem nada')).toBe(true);
  });

  it('devolve string vazia para texto vazio', () => {
    expect(buildModerationExcerpt('', 'bloqueado')).toBe('');
  });
});
