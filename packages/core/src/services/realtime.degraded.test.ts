import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../types';
import {
  REALTIME_DEGRADED_THROTTLE_MS,
  resetRealtimeDegradedThrottle,
  subscribeToCatalogChanges,
} from './realtime';

const mockTrackEvent = jest.fn();
jest.mock('./analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => null,
}));

type StatusCallback = (status: string, error?: Error) => void;

function subscribeWithFakeChannel(): StatusCallback {
  let callback: StatusCallback | null = null;
  interface FakeChannel {
    on: jest.Mock<FakeChannel, []>;
    subscribe: jest.Mock<FakeChannel, [StatusCallback]>;
  }
  const channel: FakeChannel = {
    on: jest.fn(() => channel),
    subscribe: jest.fn((cb: StatusCallback) => {
      callback = cb;
      return channel;
    }),
  };
  const client = { channel: jest.fn(() => channel), removeChannel: jest.fn() };
  subscribeToCatalogChanges(client as unknown as SupabaseClient<Database>, () => undefined);
  return (status, error) => callback?.(status, error);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-07T12:00:00Z'));
  mockTrackEvent.mockReset();
  resetRealtimeDegradedThrottle();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Regra de negócio: realtime_degraded com throttle por canal', () => {
  it('CHANNEL_ERROR emite realtime_degraded com realtime_channel e status', () => {
    const emit = subscribeWithFakeChannel();

    emit('CHANNEL_ERROR', new Error('detalhe de RLS'));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith('realtime_degraded', {
      realtime_channel: 'catalog-changes',
      status: 'CHANNEL_ERROR',
    });
  });

  it('não envia o error do callback no evento', () => {
    const emit = subscribeWithFakeChannel();

    emit('TIMED_OUT', new Error('detalhe de RLS'));

    expect(JSON.stringify(mockTrackEvent.mock.calls)).not.toContain('RLS');
  });

  it('oscilando erro a cada segundo emite no máximo um evento por janela', () => {
    const emit = subscribeWithFakeChannel();

    emit('CHANNEL_ERROR');
    jest.advanceTimersByTime(1_000);
    emit('TIMED_OUT');
    emit('SUBSCRIBED');
    jest.advanceTimersByTime(1_000);
    emit('CHANNEL_ERROR');

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('depois de REALTIME_DEGRADED_THROTTLE_MS emite de novo', () => {
    const emit = subscribeWithFakeChannel();

    emit('CHANNEL_ERROR');
    jest.advanceTimersByTime(REALTIME_DEGRADED_THROTTLE_MS - 1);
    emit('CHANNEL_ERROR');
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    emit('CHANNEL_ERROR');
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('resetRealtimeDegradedThrottle libera o próximo evento dentro da janela', () => {
    const emit = subscribeWithFakeChannel();

    emit('CHANNEL_ERROR');
    resetRealtimeDegradedThrottle();
    emit('CHANNEL_ERROR');

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});

describe('Tratamento de erro: status saudáveis e canal sem client', () => {
  it('SUBSCRIBED e CLOSED não emitem evento', () => {
    const emit = subscribeWithFakeChannel();

    emit('SUBSCRIBED');
    emit('CLOSED');

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('sem client o cleanup é no-op e nada é emitido', () => {
    const cleanup = subscribeToCatalogChanges(() => undefined);

    expect(() => cleanup()).not.toThrow();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
