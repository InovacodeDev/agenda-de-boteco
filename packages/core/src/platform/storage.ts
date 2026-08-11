import { type PersistStorage, type StateStorage } from 'zustand/middleware';

let configured: StateStorage | null = null;

/** Rehidratadores dos stores persistidos, re-executados quando o storage chega. */
const rehydrators = new Set<() => void>();

/**
 * Registra um rehidratador (normalmente `store.persist.rehydrate`). Se o storage
 * já estiver configurado, re-hidrata na hora. Idempotente por referência.
 */
export function registerRehydrator(rehydrate: () => void): void {
  rehydrators.add(rehydrate);
  if (configured) {
    rehydrate();
  }
}

/**
 * Cada app chama uma vez no bootstrap (mobile = AsyncStorage, web = localStorage).
 * Como os stores persistidos são criados ANTES do bootstrap (avaliação do módulo),
 * sua hidratação automática roda com storage vazio; ao configurar, re-hidratamos
 * todos para carregar os dados realmente persistidos.
 */
export function configureAppStorage(storage: StateStorage): void {
  configured = storage;
  for (const rehydrate of rehydrators) {
    rehydrate();
  }
}

/** StateStorage configurado, ou `null` se o bootstrap ainda não rodou. */
export function getAppStorage(): StateStorage | null {
  return configured;
}

/**
 * JSON storage do zustand sobre o storage configurado. Resolve `getAppStorage`
 * a cada operação (e não na criação), porque o `persist` do zustand é avaliado
 * no carregamento do módulo do store — antes do `configureAppStorage` rodar.
 *
 * Tolerante a storage ainda não configurado: nesse caso `getItem` devolve `null`
 * (hidratação "vazia" completa sem travar a splash) e `setItem`/`removeItem` são
 * no-ops. Quando o `configureAppStorage` roda, `registerRehydrator` recarrega os
 * dados persistidos de verdade.
 */
export const appJsonStorage: PersistStorage<unknown> = {
  getItem: (name) => {
    const storage = getAppStorage();
    if (!storage) {
      return null;
    }
    const str = storage.getItem(name);
    const parse = (value: string | null): unknown => (value === null ? null : JSON.parse(value));
    return str instanceof Promise ? str.then(parse) : parse(str);
  },
  setItem: (name, value) => {
    getAppStorage()?.setItem(name, JSON.stringify(value));
  },
  removeItem: (name) => {
    getAppStorage()?.removeItem(name);
  },
} as PersistStorage<unknown>;
