import { type AnalyticsAdapter, logErrorToTerminal } from '@agenda/core';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

export type UpdateCheckResult =
  | { status: 'unavailable' }
  | { status: 'up-to-date' }
  | { status: 'ready-to-restart' }
  | { status: 'error' };

export function isOtaUpdateAvailable(): boolean {
  return Platform.OS !== 'web' && Updates.isEnabled;
}

export function getShortUpdateId(): string {
  return Updates.updateId ? Updates.updateId.slice(0, 8) : 'embutido';
}

export function reportUpdateContext(analytics: AnalyticsAdapter | null): void {
  if (!analytics || Platform.OS === 'web') return;
  analytics.captureEvent('ota_update_context', {
    update_id: Updates.updateId ?? 'embedded',
    channel: Updates.channel ?? 'unknown',
    runtime_version: Updates.runtimeVersion ?? 'unknown',
    is_embedded_launch: Boolean(Updates.isEmbeddedLaunch),
  });
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (!isOtaUpdateAvailable()) return { status: 'unavailable' };
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return { status: 'up-to-date' };
    const fetched = await Updates.fetchUpdateAsync();
    return fetched.isNew ? { status: 'ready-to-restart' } : { status: 'up-to-date' };
  } catch (error: unknown) {
    logErrorToTerminal(error, { method: 'updates.checkForAppUpdate' });
    return { status: 'error' };
  }
}

export async function applyDownloadedUpdate(): Promise<void> {
  await Updates.reloadAsync();
}
