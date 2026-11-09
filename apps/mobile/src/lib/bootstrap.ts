import {
  configureAnalytics,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  registerAnalyticsContext,
} from '@agenda/core';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import { showUserFriendlyAlert } from '../utils/errors';
import { initAnalytics } from './analytics';
import { getSupabase } from './supabase';
import { reportUpdateContext } from './updates';

function resolveChannel(): string {
  const channel: unknown = Constants.expoConfig?.extra?.channel;
  return typeof channel === 'string' && channel ? channel : 'development';
}

function resolvePlatform(): 'web' | 'ios' | 'android' {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

configureSupabase(getSupabase);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler((error) => showUserFriendlyAlert(error));
const analytics = initAnalytics();
configureAnalytics(analytics);
registerAnalyticsContext({
  app_name: '@agenda/mobile',
  app_version: Constants.expoConfig?.version ?? 'unknown',
  channel: resolveChannel(),
  platform: resolvePlatform(),
  ota_update_id: Updates.updateId ?? 'embedded',
});
reportUpdateContext(analytics);
