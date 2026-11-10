import {
  configureAnalytics,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  getFriendlyErrorMessage,
  registerAnalyticsContext,
} from '@agenda/core';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { Alert, Platform } from 'react-native';

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
const analytics = initAnalytics();
configureAnalytics(analytics);
registerAnalyticsContext({
  app_name: '@agenda/mobile-client',
  app_version: Constants.expoConfig?.version ?? 'unknown',
  channel: resolveChannel(),
  platform: resolvePlatform(),
  ota_update_id: Updates.updateId ?? 'embedded',
});
reportUpdateContext(analytics);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler((error, { handledLocally }) => {
  if (handledLocally) return;
  Alert.alert('Erro', getFriendlyErrorMessage(error));
});
