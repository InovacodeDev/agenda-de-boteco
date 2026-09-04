import { FEATURES } from './features';

describe('FEATURES', () => {
  it('expõe as flags conhecidas', () => {
    // Trava o contrato: renomear/remover uma flag é breaking change.
    expect(Object.keys(FEATURES).sort()).toEqual(
      ['contentModeration', 'establishmentDetail', 'map', 'notifications'].sort(),
    );
  });

  it('mantém as features de entrega gradual liberadas', () => {
    expect(FEATURES.establishmentDetail).toBe(true);
    expect(FEATURES.notifications).toBe(true);
    expect(FEATURES.map).toBe(true);
  });

  // Item opcional do orçamento: o código existe e é testado, mas fica inerte
  // até o cliente aprovar. Este assert é o que garante que ninguém ligou por
  // acidente junto de outra mudança.
  it('mantém a moderação de conteúdo desligada', () => {
    expect(FEATURES.contentModeration).toBe(false);
  });
});
