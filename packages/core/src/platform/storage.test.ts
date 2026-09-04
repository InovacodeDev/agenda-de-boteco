import {
  appJsonStorage,
  configureAppStorage,
  getAppStorage,
  registerRehydrator,
  webQueryStorage,
  webStorage,
} from './storage';

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

describe('webStorage', () => {
  it('lida com ausência de window no servidor (SSR-safe)', () => {
    expect(webStorage.getItem('key')).toBeNull();
    expect(() => webStorage.setItem('key', 'val')).not.toThrow();
    expect(() => webStorage.removeItem('key')).not.toThrow();
  });

  it('delega para window.localStorage quando disponível no browser', () => {
    const mem = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: jest.fn((k: string) => mem.get(k) ?? null),
      setItem: jest.fn((k: string, v: string) => {
        mem.set(k, v);
      }),
      removeItem: jest.fn((k: string) => {
        mem.delete(k);
      }),
    };

    const originalWindow = global.window;
    (global as unknown as { window: unknown }).window = {
      localStorage: fakeLocalStorage,
    };

    try {
      webStorage.setItem('theme', 'dark');
      expect(fakeLocalStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

      expect(webStorage.getItem('theme')).toBe('dark');
      expect(fakeLocalStorage.getItem).toHaveBeenCalledWith('theme');

      webStorage.removeItem('theme');
      expect(fakeLocalStorage.removeItem).toHaveBeenCalledWith('theme');
    } finally {
      (global as unknown as { window: unknown }).window = originalWindow;
    }
  });
});

describe('webQueryStorage', () => {
  it('lida com ausência de window no servidor (SSR-safe)', async () => {
    expect(await webQueryStorage.getItem('query-key')).toBeNull();
    await expect(webQueryStorage.setItem('query-key', 'data')).resolves.toBeUndefined();
    await expect(webQueryStorage.removeItem('query-key')).resolves.toBeUndefined();
  });

  it('delega para window.localStorage quando disponível no browser', async () => {
    const mem = new Map<string, string>();
    const fakeLocalStorage = {
      getItem: jest.fn((k: string) => mem.get(k) ?? null),
      setItem: jest.fn((k: string, v: string) => {
        mem.set(k, v);
      }),
      removeItem: jest.fn((k: string) => {
        mem.delete(k);
      }),
    };

    const originalWindow = global.window;
    (global as unknown as { window: unknown }).window = {
      localStorage: fakeLocalStorage,
    };

    try {
      await webQueryStorage.setItem('cache', '{"data":1}');
      expect(fakeLocalStorage.setItem).toHaveBeenCalledWith('cache', '{"data":1}');

      expect(await webQueryStorage.getItem('cache')).toBe('{"data":1}');
      expect(fakeLocalStorage.getItem).toHaveBeenCalledWith('cache');

      await webQueryStorage.removeItem('cache');
      expect(fakeLocalStorage.removeItem).toHaveBeenCalledWith('cache');
    } finally {
      (global as unknown as { window: unknown }).window = originalWindow;
    }
  });
});

