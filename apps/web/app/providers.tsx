'use client';

import {
  CACHE_BUSTER,
  configureAppStorage,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  createQueryPersister,
  queryClient,
  setupOnlineManager,
  shouldDehydrateQuery,
} from '@agenda/core';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect } from 'react';

import { webQueryStorage, webStorage } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';

// Bootstrap dos singletons do core — roda uma vez, no client, antes da árvore montar.
// Como providers.tsx é client component e o módulo avalia no browser, é seguro tocar window.
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAppStorage(webStorage);
  configureSupabase(getSupabase);
  configureAuthRedirect(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  configureQueryErrorHandler((error) => {
    // Web: por ora console.error; um toast pode ser plugado depois.
    console.error('[query]', error);
  });
}
bootstrap();

const persister = createQueryPersister(webQueryStorage);

export function Providers({ children }: { children: React.ReactNode }) {
  // Conecta o online manager ao navigator (cleanup no unmount).
  useEffect(() => {
    return setupOnlineManager((listener) => {
      const update = () =>
        listener({ isConnected: navigator.onLine, isInternetReachable: navigator.onLine });
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    });
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60_000,
        buster: CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
