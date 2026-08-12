'use client';

import {
  configureAppStorage,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  logErrorToTerminal,
  queryClient,
  subscribeToCatalogChanges,
  useAuthStore,
} from '@agenda/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

import { webStorage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';

// Bootstrap dos singletons do core — uma vez, no client, antes da árvore montar.
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAppStorage(webStorage);
  configureSupabase(getSupabase);
  // O painel roda sob basePath /client — o retorno do OAuth/magic link precisa
  // cair em /client/login, não na raiz do domínio (que é o site público).
  configureAuthRedirect(() =>
    typeof window !== 'undefined' ? `${window.location.origin}/client/login` : '',
  );
  configureQueryErrorHandler((error) => {
    logErrorToTerminal(error, { method: 'queryClient' });
  });
}
bootstrap();

/** Liga auth e realtime do catálogo ao cache. */
function AppSyncBridge() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    // Mudanças no catálogo (inclusive as feitas aqui no painel) invalidam o cache.
    return subscribeToCatalogChanges(client, (keys) => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSyncBridge />
      {children}
    </QueryClientProvider>
  );
}
