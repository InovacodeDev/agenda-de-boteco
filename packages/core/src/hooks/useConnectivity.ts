import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  return onlineManager.subscribe(callback);
}

function getSnapshot(): boolean {
  return onlineManager.isOnline();
}

export interface Connectivity {
  isOnline: boolean;
}

/**
 * Estado de conectividade derivado do `onlineManager` do TanStack Query
 * (alimentado por NetInfo no nativo e `navigator.onLine` no web). Não
 * reimplementa detecção de rede — é uma view reativa do que já existe.
 */
export function useConnectivity(): Connectivity {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { isOnline };
}
