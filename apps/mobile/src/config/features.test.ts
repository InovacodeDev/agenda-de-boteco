import { FEATURES } from './features';

describe('FEATURES', () => {
  it('expõe as três flags de entrega gradual', () => {
    // Trava o contrato: renomear/remover uma flag é breaking change.
    expect(Object.keys(FEATURES).sort()).toEqual(
      ['establishmentDetail', 'map', 'notifications'].sort(),
    );
  });

  it('mantém as três telas bloqueadas na v1 (todas false)', () => {
    expect(FEATURES.establishmentDetail).toBe(false);
    expect(FEATURES.notifications).toBe(false);
    expect(FEATURES.map).toBe(false);
  });
});
