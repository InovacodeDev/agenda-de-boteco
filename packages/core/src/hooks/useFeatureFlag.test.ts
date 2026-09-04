/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { type AnalyticsAdapter, configureAnalytics } from '../services/analytics';
import { useFeatureFlag } from './useFeatureFlag';

function makeAdapter(): jest.Mocked<AnalyticsAdapter> {
  return {
    capturePageview: jest.fn(),
    captureEvent: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    isFeatureEnabled: jest.fn().mockReturnValue(false),
    onFeatureFlags: jest.fn().mockReturnValue(() => {}),
  };
}

afterEach(() => {
  configureAnalytics(null);
});

describe('useFeatureFlag', () => {
  it('retorna false sem adapter configurado', () => {
    const { result } = renderHook(() => useFeatureFlag('new-checkout'));
    expect(result.current).toBe(false);
  });

  it('retorna o valor inicial de isFeatureEnabled', () => {
    const adapter = makeAdapter();
    adapter.isFeatureEnabled.mockReturnValue(true);
    configureAnalytics(adapter);

    const { result } = renderHook(() => useFeatureFlag('new-checkout'));

    expect(result.current).toBe(true);
    expect(adapter.isFeatureEnabled).toHaveBeenCalledWith('new-checkout');
  });

  it('atualiza quando onFeatureFlags dispara o callback', () => {
    let flagsCallback: () => void = () => {};
    const adapter = makeAdapter();
    adapter.onFeatureFlags.mockImplementation((callback: () => void) => {
      flagsCallback = callback;
      return () => {};
    });
    configureAnalytics(adapter);

    const { result } = renderHook(() => useFeatureFlag('new-checkout'));
    expect(result.current).toBe(false);

    adapter.isFeatureEnabled.mockReturnValue(true);
    act(() => {
      flagsCallback();
    });

    expect(result.current).toBe(true);
  });

  it('chama o cleanup de onFeatureFlags ao desmontar', () => {
    const unsubscribe = jest.fn();
    const adapter = makeAdapter();
    adapter.onFeatureFlags.mockReturnValue(unsubscribe);
    configureAnalytics(adapter);

    const { unmount } = renderHook(() => useFeatureFlag('new-checkout'));
    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
