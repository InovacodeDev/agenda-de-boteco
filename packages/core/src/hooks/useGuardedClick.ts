import { useCallback, useInsertionEffect, useMemo, useRef } from 'react';

import type { PressGuardOptions } from '../utils/pressGuard';
import { createPressGuard } from '../utils/pressGuard';

/**
 * Versão protegida de um handler de clique para `<button onClick>`. Gêmeo web
 * de useGuardedPress: mesma lógica de lock (createPressGuard), outro host. Sem
 * ele, um duplo clique em botão de submit dispara duas requisições — o
 * `disabled={busy}` das telas só cobre o intervalo em que a promise está em voo.
 */
export function useGuardedClick<A extends unknown[]>(
  handler: ((...args: A) => unknown) | undefined,
  options: PressGuardOptions = {},
): ((...args: A) => void) | undefined {
  const { cooldownMs } = options;
  const handlerRef = useRef(handler);

  // useInsertionEffect (não useEffect): atualiza o ref antes do paint, então um
  // clique na UI recém-renderizada nunca executa handler obsoleto.
  useInsertionEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const pressGuard = useMemo(() => createPressGuard({ cooldownMs }), [cooldownMs]);

  const guarded = useCallback(
    (...args: A) => {
      pressGuard.guard(() => handlerRef.current?.(...args))();
    },
    [pressGuard],
  );

  return handler ? guarded : undefined;
}
