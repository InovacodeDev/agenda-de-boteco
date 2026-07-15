import { focusManager, onlineManager } from '@tanstack/react-query';

export interface ConnectivityState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export type ConnectivitySubscribe = (
  listener: (state: ConnectivityState) => void,
) => () => void;

export type FocusSubscribe = (
  listener: (isActive: boolean) => void,
) => () => void;

/**
 * Reporta o estado de conexão ao TanStack Query via `onlineManager`. A
 * dependência (`subscribe`) é injetada por cada app (mobile = NetInfo, web =
 * navigator.onLine). Considera online apenas quando há conexão E a internet é
 * alcançável (`isInternetReachable !== false`, tratando `null`/desconhecido
 * como online). Retorna o cleanup que desinscreve o listener.
 */
export function setupOnlineManager(subscribe: ConnectivitySubscribe): () => void {
  let unsubscribe: (() => void) | undefined;

  onlineManager.setEventListener((setOnline) => {
    unsubscribe = subscribe((state) => {
      setOnline(
        state.isConnected != null &&
          state.isConnected &&
          state.isInternetReachable !== false,
      );
    });
    return () => unsubscribe?.();
  });

  return () => unsubscribe?.();
}

/**
 * Reporta foco do app ao TanStack Query via `focusManager` (habilita refetch on
 * focus). A dependência (`subscribe`) é injetada por cada app e já emite um
 * boolean (isActive). Retorna o cleanup que desinscreve o listener.
 */
export function setupFocusManager(subscribe: FocusSubscribe): () => void {
  return subscribe((isActive) => {
    focusManager.setFocused(isActive);
  });
}
