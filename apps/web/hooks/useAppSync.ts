'use client';

import {
  onAuthUserChange,
  queryClient,
  subscribeToCatalogChanges,
  useAuthStore,
  useFavoritesStore,
} from '@agenda/core';
import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSupabase } from '@/lib/supabase';

/**
 * Liga, no web, o mesmo wiring que o mobile faz no RootLayout:
 * - inicializa a sessão e passa a observar mudanças de auth;
 * - ao logar, faz merge dos favoritos locais no servidor;
 * - drena a fila de favoritos pendentes quando volta a ficar online;
 * - mantém o cache em sincronia com o Postgres via realtime, reinscrevendo e
 *   revalidando o catálogo ao voltar para a aba (visibilitychange).
 *
 * Degrada graciosamente: sem Supabase configurado, o realtime é no-op e o auth
 * reporta `unavailable`.
 */
export function useAppSync(): void {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Favoritos: merge ao logar + flush ao reconectar.
  useEffect(() => {
    const { flushQueue, mergeLocalIntoServer } = useFavoritesStore.getState();
    let lastUserId: string | null = useAuthStore.getState().user?.id ?? null;

    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        flushQueue(useAuthStore.getState().user?.id ?? null);
      }
    });
    const unsubscribeAuth = onAuthUserChange((user) => {
      const nextUserId = user?.id ?? null;
      if (nextUserId !== null && nextUserId !== lastUserId) {
        void mergeLocalIntoServer(nextUserId);
      }
      lastUserId = nextUserId;
    });

    return () => {
      unsubscribeOnline();
      unsubscribeAuth();
    };
  }, []);

  // Realtime: assina o catálogo; ao reentrar na aba, reinscreve e revalida.
  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      return;
    }

    const invalidate = (keys: ReadonlyArray<readonly unknown[]>): void => {
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    };

    let unsubscribe = subscribeToCatalogChanges(client, invalidate);

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        unsubscribe();
        unsubscribe = subscribeToCatalogChanges(client, invalidate);
        void queryClient.invalidateQueries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubscribe();
    };
  }, []);
}
