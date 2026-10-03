import {
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
  getFriendlyErrorMessage,
} from '@agenda/core';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import { getSupabase } from './supabase';

configureSupabase(getSupabase);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler((error: unknown) => {
  Alert.alert('Erro', getFriendlyErrorMessage(error));
});
