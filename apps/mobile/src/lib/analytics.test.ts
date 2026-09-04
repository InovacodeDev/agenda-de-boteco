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

    adapter?.capturePageview('/feed');
    expect(mockScreen).toHaveBeenCalledWith('/feed');

    adapter?.captureEvent('favorite_toggled', { isFavorite: true });
    expect(mockCapture).toHaveBeenCalledWith('favorite_toggled', { isFavorite: true });

    adapter?.identify('user-id');
    expect(mockIdentify).toHaveBeenCalledWith('user-id');

    adapter?.reset();
    expect(mockReset).toHaveBeenCalled();

    mockIsFeatureEnabled.mockReturnValueOnce(undefined);
    expect(adapter?.isFeatureEnabled('some-flag')).toBe(false);

    const callback = jest.fn();
    adapter?.onFeatureFlags(callback);
    expect(mockOnFeatureFlags).toHaveBeenCalled();
    const registered = mockOnFeatureFlags.mock.calls[0][0] as () => void;
    registered();
    expect(callback).toHaveBeenCalled();
  });
});
