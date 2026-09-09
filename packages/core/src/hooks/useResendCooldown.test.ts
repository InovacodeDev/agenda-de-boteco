/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

import { OTP_ATTEMPTS_PER_HOUR, useResendCooldown } from './useResendCooldown';

describe('useResendCooldown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('comeca pronto para enviar', () => {
    const { result } = renderHook(() => useResendCooldown());

    expect(result.current.isReady).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.attempts).toBe(0);
  });

  it('bloqueia e inicia a contagem depois de start', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.remainingSeconds).toBe(60);
  });

  it('decrementa a contagem a cada segundo', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.remainingSeconds).toBe(57);
  });

  it('volta a ficar pronto quando a contagem zera', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 2 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('conta as tentativas acumuladas', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 1 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.start();
    });

    expect(result.current.attempts).toBe(2);
  });

  it('avisa quando atinge o limite de envios por hora do Supabase', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 1 }));

    for (let i = 0; i < OTP_ATTEMPTS_PER_HOUR; i += 1) {
      act(() => {
        result.current.start();
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(result.current.hasReachedHourlyLimit).toBe(true);
  });

  it('reset zera contagem e tentativas', () => {
    const { result } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.attempts).toBe(0);
    expect(result.current.hasReachedHourlyLimit).toBe(false);
  });

  it('limpa o intervalo ao desmontar', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { result, unmount } = renderHook(() => useResendCooldown({ cooldownSeconds: 60 }));

    act(() => {
      result.current.start();
    });
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
