import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';

type NetInfoSubscribe = (
  listener: (state: NetInfoState) => void,
) => () => void;

type AppStateSubscribe = (
  listener: (status: AppStateStatus) => void,
) => NativeEventSubscription;

const defaultAppStateSubscribe: AppStateSubscribe = (listener) =>
  AppState.addEventListener('change', listener);

/**
 * Reporta o estado de conexão ao TanStack Query via `onlineManager`. A
 * dependência (`subscribe`) é injetável para testes; o default usa NetInfo.
 * Considera online apenas quando há conexão E a internet é alcançável
 * (`isInternetReachable !== false`, tratando `null`/desconhecido como online).
 * Retorna o cleanup que desinscreve o listener.
 */
export function setupOnlineManager(
  subscribe: NetInfoSubscribe = NetInfo.addEventListener,
): () => void {
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
 * focus). A dependência (`subscribe`) é injetável; o default usa AppState.
 * Retorna o cleanup que remove o subscription.
 */
export function setupFocusManager(
  subscribe: AppStateSubscribe = defaultAppStateSubscribe,
): () => void {
  const subscription = subscribe((status) => {
    focusManager.setFocused(status === 'active');
  });

  return () => subscription.remove();
}
