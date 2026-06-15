import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { getSupabase } from '@/lib/supabase';
import { catalogKeys } from '@/services/queryKeys';
import { subscribeToCatalogChanges } from '@/services/realtime';

/** Roots do catálogo invalidadas ao reentrar em `active` (cobre mudanças perdidas). */
const REALTIME_ROOTS: ReadonlyArray<readonly unknown[]> = [
  catalogKeys.events.root,
  catalogKeys.establishments.root,
  catalogKeys.notifications,
];

/**
 * Ações que o handler de AppState pode acionar. Injetáveis para tornar a
 * transição de estado uma função pura e testável sem renderizar o hook.
 */
export interface RealtimeStateActions {
  /** Cria a subscription e retorna seu cleanup. */
  subscribe: () => () => void;
  /** Invalida as roots do catálogo. */
  invalidateRoots: () => void;
  /** Remove a subscription viva. */
  teardown: (unsubscribe: () => void) => void;
}

/**
 * Reducer puro da máquina de estados do realtime guiada por AppState. Decide,
 * a partir do status e do cleanup atual (`current`), qual a próxima referência
 * de cleanup, executando as ações injetadas como efeito.
 *
 * Discriminador alinhado ao `setupFocusManager` (usa `status === 'active'`):
 * - `active` sem canal → `subscribe` + `invalidateRoots`; já com canal → no-op.
 * - `background` com canal → `teardown` e zera a ref.
 * - qualquer outro status (notavelmente `inactive`) → no-op, mantendo o socket
 *   vivo durante interações transitórias (Control Center, banner de chamada,
 *   diálogo de permissão/biometria) que disparam `inactive` sem ir a background.
 */
export function nextRealtimeState(
  status: AppStateStatus,
  current: (() => void) | null,
  actions: RealtimeStateActions,
): (() => void) | null {
  if (status === 'active') {
    if (current) {
      return current;
    }
    const unsubscribe = actions.subscribe();
    actions.invalidateRoots();
    return unsubscribe;
  }

  if (status === 'background' && current) {
    actions.teardown(current);
    return null;
  }

  return current;
}

/**
 * Mantém o cache do TanStack Query em sincronia com o Postgres via realtime.
 *
 * - Degrada graciosamente: se `getSupabase()` for null (Supabase não
 *   configurado), é um no-op — nada é assinado.
 * - O socket morre quando o app vai a `background` no RN, então desinscrevemos
 *   SÓ em `background` e reinscrevemos ao voltar para `active`, invalidando as
 *   roots do catálogo para cobrir mudanças perdidas enquanto offline.
 *   `inactive` é ignorado: dispara em interações transitórias (Control Center,
 *   chamada, biometria) onde o socket continua vivo e saudável.
 * - Garante UM canal por vez: a reinscrição só ocorre depois de remover o canal
 *   anterior. O cleanup do efeito remove canal + listener de AppState.
 */
export function useRealtimeSync(): void {
  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      return;
    }

    const invalidate = (keys: ReadonlyArray<readonly unknown[]>): void => {
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    };

    const actions: RealtimeStateActions = {
      subscribe: () => subscribeToCatalogChanges(client, invalidate),
      invalidateRoots: () => invalidate(REALTIME_ROOTS),
      teardown: (unsubscribe) => unsubscribe(),
    };

    let unsubscribe: (() => void) | null = actions.subscribe();

    const handleAppStateChange = (status: AppStateStatus): void => {
      unsubscribe = nextRealtimeState(status, unsubscribe, actions);
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      unsubscribe?.();
      unsubscribe = null;
    };
  }, []);
}
