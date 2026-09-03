'use client';

import { configureAnalytics, configureSupabase, trackPageview } from '@agenda/core';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { initAnalytics } from '@/lib/analytics';
import { getSupabase } from '@/lib/supabase';

// Bootstrap dos singletons do core — uma vez, antes da árvore montar.
// Sem QueryClientProvider: o cadastro é uma escrita única, sem cache de leitura.
// Quando o login do artista entrar, `configureAuthRedirect` vem junto e precisa
// apontar para dentro do basePath (`/artists`) — a landing faz rewrite por
// prefixo, e a origin nua devolveria o token na landing, que o descarta.
let bootstrapped = false;
function bootstrap() {
  if (bootstrapped) return;
  bootstrapped = true;
  configureSupabase(getSupabase);
  configureAnalytics(initAnalytics());
}
bootstrap();

// Pageview manual: o PostHog adapter desliga capture_pageview automático
// porque o App Router navega sem full load.
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
