'use client';

import {
  configureAnalytics,
  createPostHogBrowserAdapter,
  postHogUiHost,
  registerAnalyticsContext,
  trackPageview,
} from '@agenda/core';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { version } from '../package.json';

// Bootstrap dos singletons do core — uma vez, antes da árvore montar. Landing
// não tem auth nem cache de leitura: só analytics (sem QueryClient/Supabase).
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureAnalytics(
    createPostHogBrowserAdapter(posthog, {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: '/ingest',
      uiHost: postHogUiHost(process.env.NEXT_PUBLIC_POSTHOG_HOST),
    }),
  );
  registerAnalyticsContext({
    app_name: '@agenda/landing',
    app_version: version,
    channel: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    platform: 'web',
  });
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
