'use client';

import {
  CACHE_BUSTER,
  configureAnalytics,
  configureAppStorage,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  createPostHogBrowserAdapter,
  createQueryPersister,
  queryClient,
  setupOnlineManager,
  shouldDehydrateQuery,
  trackPageview,
  webQueryStorage,
  webStorage,
} from '@agenda/core';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { useAppSync } from '@/hooks/useAppSync';
import { appBaseUrl } from '@/lib/basePath';
import { getSupabase } from '@/lib/supabase';

// Bootstrap dos singletons do core — roda uma vez, no client, antes da árvore montar.
// Como providers.tsx é client component e o módulo avalia no browser, é seguro tocar window.
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAppStorage(webStorage);
  configureSupabase(getSupabase);
  configureAuthRedirect(appBaseUrl);
  configureAnalytics(
    createPostHogBrowserAdapter(posthog, {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    }),
  );
  configureQueryErrorHandler((error) => {
    // Web: por ora console.error; um toast pode ser plugado depois.
    console.error('[query]', error);
  });
}
bootstrap();

/** Dispara pageview a cada troca de rota — o App Router não gera navegação full-reload. */
function PostHogPageview() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

const persister = createQueryPersister(webQueryStorage);

/** Liga auth/favoritos/realtime ao cache. Dentro do provider para ter contexto. */
function AppSyncBridge() {
  useAppSync();
  return null;
}

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
      <AppSyncBridge />
      <PostHogPageview />
      {children}
    </PersistQueryClientProvider>
  );
}
