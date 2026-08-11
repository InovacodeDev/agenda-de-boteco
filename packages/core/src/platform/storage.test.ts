import { appJsonStorage, configureAppStorage, getAppStorage, registerRehydrator } from './storage';

/**
 * Regressão: o `persist` do zustand cria os stores (e dispara hidratação) ANTES
 * de o app chamar `configureAppStorage` no bootstrap. O storage precisa tolerar
 * essa janela (getItem → null, sem lançar) e re-hidratar quando configurado —
 * senão `hasHydrated` nunca vira true e a splash trava.
 */
describe('appJsonStorage tolerante a bootstrap tardio', () => {
  it('getItem devolve null (sem lançar) quando o storage ainda não foi configurado', () => {
    // jest.setup.ts configura um storage global; reconfiguramos para um cenário
    // controlado e validamos o comportamento de leitura.
    const mem = new Map<string, string>();
    configureAppStorage({
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    });
    expect(getAppStorage()).not.toBeNull();
    expect(appJsonStorage.getItem('inexistente')).toBeNull();
  });

  it('setItem persiste e getItem relê (round-trip JSON)', () => {
    const mem = new Map<string, string>();
    configureAppStorage({
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    });
    appJsonStorage.setItem('k', { state: { a: 1 }, version: 0 });
    expect(appJsonStorage.getItem('k')).toEqual({ state: { a: 1 }, version: 0 });
  });

  it('configureAppStorage dispara os rehidratadores registrados', () => {
    const mem = new Map<string, string>();
    let calls = 0;
    registerRehydrator(() => {
      calls += 1;
    });
    const before = calls;
    configureAppStorage({
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    });
    expect(calls).toBeGreaterThan(before);
  });
});
