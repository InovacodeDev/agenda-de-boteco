import { FEATURES } from './features';

describe('FEATURES', () => {
  it('expõe as três flags de entrega gradual', () => {
    // Trava o contrato: renomear/remover uma flag é breaking change.
    expect(Object.keys(FEATURES).sort()).toEqual(
      ['establishmentDetail', 'map', 'notifications'].sort(),
    );
  });

  it('mantém todas as features liberadas', () => {
    expect(FEATURES.establishmentDetail).toBe(true);
    expect(FEATURES.notifications).toBe(true);
    expect(FEATURES.map).toBe(true);
  });
});
