'use client';

import { configureAnalytics, createPostHogBrowserAdapter, trackPageview } from '@agenda/core';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

// Bootstrap dos singletons do core — uma vez, antes da árvore montar. Landing
// não tem auth nem cache de leitura: só analytics (sem QueryClient/Supabase).
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAnalytics(
    createPostHogBrowserAdapter(posthog, {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    }),
  );
}
bootstrap();

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
    <>
      <PostHogPageview />
      {children}
    </>
  );
}
