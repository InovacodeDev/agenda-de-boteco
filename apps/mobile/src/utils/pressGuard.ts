export interface PressGuardOptions {
  /** Janela mínima entre execuções. Default: 600ms (cobre a transição de tela do expo-router). */
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 600;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === 'function'
  );
}

/**
 * Lock leading-edge contra double-tap: a primeira chamada executa na hora;
 * as seguintes são ignoradas enquanto durar o cooldown ou um handler async
 * pendente — o que for maior. Cada instância tem lock próprio.
 */
export function createPressGuard({ cooldownMs = DEFAULT_COOLDOWN_MS }: PressGuardOptions = {}) {
  let lockedUntil = 0;
  let pending = false;

  function guard<A extends unknown[]>(handler: (...args: A) => unknown): (...args: A) => void {
    return (...args: A) => {
      const now = Date.now();
      if (pending || now < lockedUntil) {
        return;
      }
      lockedUntil = now + cooldownMs;
      const result = handler(...args);
      if (isThenable(result)) {
        pending = true;
        result.then(
          () => {
            pending = false;
          },
          () => {
            pending = false;
          },
        );
      }
    };
  }

  return { guard };
}
