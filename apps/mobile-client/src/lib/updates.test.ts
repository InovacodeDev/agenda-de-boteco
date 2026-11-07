import type { AnalyticsAdapter } from '@agenda/core';
import * as Updates from 'expo-updates';

import {
  applyDownloadedUpdate,
  checkForAppUpdate,
  getShortUpdateId,
  isOtaUpdateAvailable,
  reportUpdateContext,
} from './updates';

const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();
const mockLogErrorToTerminal = jest.fn();

jest.mock('@agenda/core', () => ({
  logErrorToTerminal: (...args: unknown[]) => mockLogErrorToTerminal(...args),
}));

jest.mock('expo-updates', () => ({
  __esModule: true,
  isEnabled: true,
  updateId: '12345678-9abc-4def-8000-111111111111',
  channel: 'alfa',
  runtimeVersion: 'rt-abc',
  isEmbeddedLaunch: false,
  checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdateAsync(...args),
  fetchUpdateAsync: (...args: unknown[]) => mockFetchUpdateAsync(...args),
  reloadAsync: (...args: unknown[]) => mockReloadAsync(...args),
}));

const mutableUpdates = Updates as {
  isEnabled: boolean;
  updateId: string | null;
  channel: string | null;
  runtimeVersion: string | null;
  isEmbeddedLaunch: boolean;
};

describe('Regra de negócio: verificação e aplicação de OTA no mobile-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableUpdates.isEnabled = true;
    mutableUpdates.updateId = '12345678-9abc-4def-8000-111111111111';
    mutableUpdates.channel = 'alfa';
    mutableUpdates.runtimeVersion = 'rt-abc';
    mutableUpdates.isEmbeddedLaunch = false;
  });

  it('returns unavailable without calling checkForUpdateAsync when Updates.isEnabled is false', async () => {
    mutableUpdates.isEnabled = false;
    const res = await checkForAppUpdate();
    expect(res).toEqual({ status: 'unavailable' });
    expect(mockCheckForUpdateAsync).not.toHaveBeenCalled();
    expect(isOtaUpdateAvailable()).toBe(false);
  });

  it('returns up-to-date when checkForUpdateAsync reports isAvailable: false', async () => {
    mockCheckForUpdateAsync.mockResolvedValueOnce({ isAvailable: false });
    const res = await checkForAppUpdate();
    expect(res).toEqual({ status: 'up-to-date' });
    expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('fetches update and returns ready-to-restart when checkForUpdateAsync reports isAvailable: true', async () => {
    mockCheckForUpdateAsync.mockResolvedValueOnce({ isAvailable: true });
    mockFetchUpdateAsync.mockResolvedValueOnce({ isNew: true });
    const res = await checkForAppUpdate();
    expect(res).toEqual({ status: 'ready-to-restart' });
    expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('reportUpdateContext is a safe no-op when analytics is null and captures 4 fields when present', () => {
    expect(() => reportUpdateContext(null)).not.toThrow();

    const captureEvent = jest.fn();
    const adapter: AnalyticsAdapter = {
      capturePageview: jest.fn(),
      captureEvent,
      identify: jest.fn(),
      reset: jest.fn(),
      isFeatureEnabled: () => false,
      onFeatureFlags: () => () => {},
    };

    reportUpdateContext(adapter);
    expect(captureEvent).toHaveBeenCalledWith('ota_update_context', {
      update_id: '12345678-9abc-4def-8000-111111111111',
      channel: 'alfa',
      runtime_version: 'rt-abc',
      is_embedded_launch: false,
    });
  });

  it('applyDownloadedUpdate delegates to Updates.reloadAsync and getShortUpdateId returns 8 chars or embutido', async () => {
    mockReloadAsync.mockResolvedValueOnce(undefined);
    await applyDownloadedUpdate();
    expect(mockReloadAsync).toHaveBeenCalledTimes(1);
    expect(getShortUpdateId()).toBe('12345678');

    mutableUpdates.updateId = null;
    expect(getShortUpdateId()).toBe('embutido');
  });
});

describe('Tratamento de erro: falha ao consultar atualização OTA no mobile-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutableUpdates.isEnabled = true;
  });

  it('logs via logErrorToTerminal without args and returns error when checkForUpdateAsync throws', async () => {
    const err = new Error('network failed');
    mockCheckForUpdateAsync.mockRejectedValueOnce(err);

    const res = await checkForAppUpdate();
    expect(res).toEqual({ status: 'error' });
    expect(mockLogErrorToTerminal).toHaveBeenCalledWith(err, {
      method: 'updates.checkForAppUpdate',
    });
  });
});
