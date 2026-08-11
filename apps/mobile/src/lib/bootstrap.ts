import { configureAuthRedirect, configureQueryErrorHandler, configureSupabase } from '@agenda/core';
import * as Linking from 'expo-linking';

import { showUserFriendlyAlert } from '../utils/errors';
import { getSupabase } from './supabase';

configureSupabase(getSupabase);
configureAuthRedirect(() => Linking.createURL('/'));
configureQueryErrorHandler(showUserFriendlyAlert);
