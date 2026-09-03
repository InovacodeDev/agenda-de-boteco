'use client';

import {
  configureAnalytics,
  configureAppStorage,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  createPostHogBrowserAdapter,
  queryClient,
  subscribeToCatalogChanges,
  trackPageview,
  useAuthStore,
  webStorage,
} from '@agenda/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { getSupabase } from '@/lib/supabase';

// Bootstrap dos singletons do core — uma vez, no client, antes da árvore montar.
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAppStorage(webStorage);
  configureSupabase(getSupabase);
  configureAnalytics(
    createPostHogBrowserAdapter(posthog, {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    }),
  );
  configureAuthRedirect(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  configureQueryErrorHandler((error) => {
    console.error('[query]', error);
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
    // Mudanças no catálogo (inclusive as feitas aqui no admin) invalidam o cache.
    return subscribeToCatalogChanges(client, (keys) => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
  }, []);

  return null;
}

/** Pageview manual por rota — capture_pageview fica desligado no init (SPA/App Router). */
function PostHogPageview() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppSyncBridge />
      <PostHogPageview />
      {children}
    </QueryClientProvider>
  );
}
