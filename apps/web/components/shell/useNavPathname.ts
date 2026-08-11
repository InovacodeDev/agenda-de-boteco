'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isDetailRoute } from './navItems';

const STORAGE_KEY = 'nav:last-tab';

/**
 * Pathname usado para destacar a aba ativa. Em rotas de detalhe (evento/estabelecimento),
 * mantém a última aba visitada — entrar pelos Favoritos deixa Favoritos aceso, e assim por diante.
 */
export function useNavPathname(): string {
  const pathname = usePathname();
  const detail = isDetailRoute(pathname);
  const [lastTab, setLastTab] = useState('/');

  useEffect(() => {
    if (detail) return;
    queueMicrotask(() => {
      setLastTab(pathname);
      sessionStorage.setItem(STORAGE_KEY, pathname);
    });
  }, [detail, pathname]);

  // Detalhe aberto direto por URL/reload: recupera a aba da sessão anterior.
  useEffect(() => {
    if (!detail) return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    queueMicrotask(() => {
      setLastTab(stored);
    });
  }, [detail]);

  return detail ? lastTab : pathname;
}
