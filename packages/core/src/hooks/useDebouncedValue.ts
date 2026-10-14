import { useEffect, useState } from 'react';

/** Atraso padrão para busca digitada: curto o bastante para parecer vivo, longo o bastante para não consultar a cada tecla. */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Devolve `value` só depois de `delayMs` sem mudança. Serve para atrasar a
 * query de busca enquanto o usuário digita; o filtro client-side segue usando
 * o valor imediato.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
