/**
 * connectivity é um service com lógica → exige teste. Contrato travado: mapear
 * eventos de rede/AppState para `onlineManager`/`focusManager` reais do
 * TanStack, e devolver cleanup que desinscreve. Usamos os managers reais
 * (não mockamos o TanStack) e injetamos fakes de `subscribe` para controlar os
 * eventos. O estado dos managers é restaurado entre testes.
 */
import type { NetInfoState } from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { type AppStateStatus, type NativeEventSubscription } from 'react-native';

import { setupFocusManager, setupOnlineManager } from './connectivity';

/** Constrói um NetInfoState mínimo com apenas os campos lidos pela função. */
function netState(
  partial: Partial<Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>>,
): NetInfoState {
  return {
    isConnected: false,
    isInternetReachable: false,
    ...partial,
  } as unknown as NetInfoState;
}

describe('setupOnlineManager', () => {
  afterEach(() => {
    // Restaura o manager para o default (online) após cada teste.
    onlineManager.setEventListener(() => () => undefined);
    onlineManager.setOnline(true);
  });

  it('fica online quando isConnected e isInternetReachable são true', () => {
    let emit: ((state: NetInfoState) => void) | undefined;
    const unsubscribe = jest.fn();
    const subscribe = jest.fn((listener: (state: NetInfoState) => void) => {
      emit = listener;
      return unsubscribe;
    });

    setupOnlineManager(subscribe);
    emit?.(netState({ isConnected: true, isInternetReachable: true }));

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('fica offline quando isConnected é false', () => {
    let emit: ((state: NetInfoState) => void) | undefined;
    const subscribe = jest.fn((listener: (state: NetInfoState) => void) => {
      emit = listener;
      return jest.fn();
    });

    setupOnlineManager(subscribe);
    emit?.(netState({ isConnected: false }));

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('fica offline quando isInternetReachable é false mesmo conectado', () => {
    let emit: ((state: NetInfoState) => void) | undefined;
    const subscribe = jest.fn((listener: (state: NetInfoState) => void) => {
      emit = listener;
      return jest.fn();
    });

    setupOnlineManager(subscribe);
    emit?.(netState({ isConnected: true, isInternetReachable: false }));

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('cleanup chama o unsubscribe do subscribe', () => {
    const unsubscribe = jest.fn();
    const subscribe = jest.fn(() => unsubscribe);

    const teardown = setupOnlineManager(subscribe);
    teardown();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('setupFocusManager', () => {
  afterEach(() => {
    focusManager.setEventListener(() => () => undefined);
    focusManager.setFocused(undefined);
  });

  function makeAppStateSubscribe() {
    let emit: ((status: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    const subscribe = jest.fn((listener: (status: AppStateStatus) => void) => {
      emit = listener;
      return { remove } as unknown as NativeEventSubscription;
    });
    return { subscribe, remove, getEmit: () => emit };
  }

  it('foca quando AppState muda para "active"', () => {
    const { subscribe, getEmit } = makeAppStateSubscribe();

    setupFocusManager(subscribe);
    getEmit()?.('active');

    expect(focusManager.isFocused()).toBe(true);
  });

  it('desfoca quando AppState muda para "background"', () => {
    const { subscribe, getEmit } = makeAppStateSubscribe();

    setupFocusManager(subscribe);
    getEmit()?.('background');

    expect(focusManager.isFocused()).toBe(false);
  });

  it('cleanup chama .remove() do subscription', () => {
    const { subscribe, remove } = makeAppStateSubscribe();

    const teardown = setupFocusManager(subscribe);
    teardown();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
