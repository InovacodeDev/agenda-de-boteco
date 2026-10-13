import {
  configureAnalytics,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  getFriendlyErrorMessage,
} from '@agenda/core';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { initAnalytics } from './analytics';
import { getSupabase } from './supabase';

configureSupabase(getSupabase);
configureAnalytics(initAnalytics());
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler((error: unknown) => {
  Alert.alert('Erro', getFriendlyErrorMessage(error));
});
