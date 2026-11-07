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
import { reportUpdateContext } from './updates';

configureSupabase(getSupabase);
const analytics = initAnalytics();
configureAnalytics(analytics);
reportUpdateContext(analytics);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler((error: unknown) => {
  Alert.alert('Erro', getFriendlyErrorMessage(error));
});
