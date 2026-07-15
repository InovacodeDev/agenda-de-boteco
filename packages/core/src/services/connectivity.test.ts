/**
 * connectivity é um service com lógica → exige teste. Contrato travado: mapear
 * eventos de conectividade/foco para `onlineManager`/`focusManager` reais do
 * TanStack, e devolver cleanup que desinscreve. Usamos os managers reais
 * (não mockamos o TanStack) e injetamos fakes de `subscribe` para controlar os
 * eventos. O estado dos managers é restaurado entre testes.
 */
import { focusManager, onlineManager } from '@tanstack/react-query';

import {
  type ConnectivityState,
  setupFocusManager,
  setupOnlineManager,
} from './connectivity';

/** Constrói um ConnectivityState mínimo com apenas os campos lidos pela função. */
function netState(
  partial: Partial<ConnectivityState>,
): ConnectivityState {
  return {
    isConnected: false,
    isInternetReachable: false,
    ...partial,
  };
}

describe('setupOnlineManager', () => {
  afterEach(() => {
    // Restaura o manager para o default (online) após cada teste.
    onlineManager.setEventListener(() => () => undefined);
    onlineManager.setOnline(true);
  });

  it('fica online quando isConnected e isInternetReachable são true', () => {
    let emit: ((state: ConnectivityState) => void) | undefined;
    const unsubscribe = jest.fn();
    const subscribe = jest.fn((listener: (state: ConnectivityState) => void) => {
      emit = listener;
      return unsubscribe;
    });

    setupOnlineManager(subscribe);
    emit?.(netState({ isConnected: true, isInternetReachable: true }));

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('fica offline quando isConnected é false', () => {
    let emit: ((state: ConnectivityState) => void) | undefined;
    const subscribe = jest.fn((listener: (state: ConnectivityState) => void) => {
      emit = listener;
      return jest.fn();
    });

    setupOnlineManager(subscribe);
    emit?.(netState({ isConnected: false }));

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('fica offline quando isInternetReachable é false mesmo conectado', () => {
    let emit: ((state: ConnectivityState) => void) | undefined;
    const subscribe = jest.fn((listener: (state: ConnectivityState) => void) => {
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

  function makeFocusSubscribe() {
    let emit: ((isActive: boolean) => void) | undefined;
    const unsubscribe = jest.fn();
    const subscribe = jest.fn((listener: (isActive: boolean) => void) => {
      emit = listener;
      return unsubscribe;
    });
    return { subscribe, unsubscribe, getEmit: () => emit };
  }

  it('foca quando o subscribe emite true (app ativo)', () => {
    const { subscribe, getEmit } = makeFocusSubscribe();

    setupFocusManager(subscribe);
    getEmit()?.(true);

    expect(focusManager.isFocused()).toBe(true);
  });

  it('desfoca quando o subscribe emite false (app em background)', () => {
    const { subscribe, getEmit } = makeFocusSubscribe();

    setupFocusManager(subscribe);
    getEmit()?.(false);

    expect(focusManager.isFocused()).toBe(false);
  });

  it('cleanup chama o unsubscribe do subscribe', () => {
    const { subscribe, unsubscribe } = makeFocusSubscribe();

    const teardown = setupFocusManager(subscribe);
    teardown();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
