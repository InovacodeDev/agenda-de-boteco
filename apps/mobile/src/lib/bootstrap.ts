import {
  configureAnalytics,
  configureAuthRedirect,
  configureQueryErrorHandler,
  configureSupabase,
} from '@agenda/core';
import * as Linking from 'expo-linking';

import { showUserFriendlyAlert } from '../utils/errors';
import { initAnalytics } from './analytics';
import { getSupabase } from './supabase';
import { reportUpdateContext } from './updates';

configureSupabase(getSupabase);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler(showUserFriendlyAlert);
const analytics = initAnalytics();
configureAnalytics(analytics);
reportUpdateContext(analytics);
