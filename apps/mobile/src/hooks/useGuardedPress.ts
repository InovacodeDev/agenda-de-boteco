import { useCallback, useInsertionEffect, useMemo, useRef } from 'react';

import type { PressGuardOptions } from '@/utils/pressGuard';
import { createPressGuard } from '@/utils/pressGuard';

/**
 * Versão protegida de um handler de pressão: bloqueia double-tap por instância
 * de componente (ver createPressGuard). A referência retornada é estável e
 * sempre invoca o handler mais recente.
 */
export function useGuardedPress<A extends unknown[]>(
  handler: ((...args: A) => unknown) | undefined,
  options: PressGuardOptions = {},
): ((...args: A) => void) | undefined {
  const { cooldownMs } = options;
  const handlerRef = useRef(handler);

  // useInsertionEffect (não useEffect): atualiza o ref antes do paint, então um
  // toque na UI recém-renderizada nunca executa handler obsoleto (padrão do
  // polyfill de useEvent). Com useEffect haveria janela entre paint e flush.
  useInsertionEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const pressGuard = useMemo(() => createPressGuard({ cooldownMs }), [cooldownMs]);

  // O wrapper é criado a cada toque para que o ref só seja lido no evento
  // (regra react-hooks/refs); o lock vive no pressGuard, compartilhado entre toques.
  const guarded = useCallback(
    (...args: A) => {
      pressGuard.guard(() => handlerRef.current?.(...args))();
    },
    [pressGuard],
  );

  return handler ? guarded : undefined;
}
