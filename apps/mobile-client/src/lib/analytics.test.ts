const mockCapture = jest.fn();
const mockScreen = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockIsFeatureEnabled = jest.fn();
const mockOnFeatureFlags = jest.fn();

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    screen: mockScreen,
    identify: mockIdentify,
    reset: mockReset,
    isFeatureEnabled: mockIsFeatureEnabled,
    onFeatureFlags: mockOnFeatureFlags,
  })),
}));

import { initAnalytics } from './analytics';

describe('initAnalytics', () => {
  const originalKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = originalKey;
  });

  it('retorna null sem EXPO_PUBLIC_POSTHOG_KEY (analytics não configurado)', () => {
    delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    expect(initAnalytics()).toBeNull();
  });

  it('delega para o client do posthog-react-native quando a key está configurada', () => {
    process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
    const adapter = initAnalytics();
    expect(adapter).not.toBeNull();

    adapter?.capturePageview('/metrics');
    expect(mockScreen).toHaveBeenCalledWith('/metrics');

    adapter?.captureEvent('event_saved', { count: 1 });
    expect(mockCapture).toHaveBeenCalledWith('event_saved', { count: 1 });

    adapter?.identify('external-id');
    expect(mockIdentify).toHaveBeenCalledWith('external-id');

    adapter?.reset();
    expect(mockReset).toHaveBeenCalled();

    mockIsFeatureEnabled.mockReturnValueOnce(undefined);
    expect(adapter?.isFeatureEnabled('panel-metrics')).toBe(false);
    mockIsFeatureEnabled.mockReturnValueOnce(true);
    expect(adapter?.isFeatureEnabled('panel-metrics')).toBe(true);

    const callback = jest.fn();
    adapter?.onFeatureFlags(callback);
    const registered = mockOnFeatureFlags.mock.calls[0][0] as () => void;
    registered();
    expect(callback).toHaveBeenCalled();
  });
});
