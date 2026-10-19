import { z } from 'zod';

import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';

export const pushPlatformSchema = z.enum(['ios', 'android']);
export type PushPlatform = z.infer<typeof pushPlatformSchema>;

const pushTokenInputSchema = z.object({
  token: z.string().min(1).max(512),
  platform: pushPlatformSchema,
});
export type PushTokenInput = z.infer<typeof pushTokenInputSchema>;

export const notificationPreferencesSchema = z.object({
  channelEmail: z.boolean(),
  channelPush: z.boolean(),
  alertReviews: z.boolean(),
  alertMusicians: z.boolean(),
  alertEventStatus: z.boolean(),
  alertEmptySchedule: z.boolean(),
  alertWeeklyDigest: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channelEmail: true,
  channelPush: true,
  alertReviews: true,
  alertMusicians: true,
  alertEventStatus: true,
  alertEmptySchedule: true,
  alertWeeklyDigest: false,
};

const preferencesRowSchema = z.object({
  channel_email: z.boolean(),
  channel_push: z.boolean(),
  alert_reviews: z.boolean(),
  alert_musicians: z.boolean(),
  alert_event_status: z.boolean(),
  alert_empty_schedule: z.boolean(),
  alert_weekly_digest: z.boolean(),
});

const PREFERENCES_COLUMNS =
  'channel_email, channel_push, alert_reviews, alert_musicians, alert_event_status, alert_empty_schedule, alert_weekly_digest';

function requireClient() {
  const client = getConfiguredSupabase();
  if (!client) {
    throw new Error('Supabase não configurado');
  }
  return client;
}

async function requireUserId(client: ReturnType<typeof requireClient>): Promise<string> {
  const { data } = await client.auth.getSession();
  const userId = data.session?.user?.id;
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }
  return userId;
}

/**
 * Vincula o token do aparelho à conta logada via RPC SECURITY DEFINER: o token
 * é UNIQUE e o mesmo aparelho pode trocar de conta (logout/login), então a
 * reatribuição de dono não passa pela policy own_update_push_tokens (que exige
 * já ser o dono da linha) — a RPC reatribui agindo sobre auth.uid().
 */
export async function registerPushToken(input: PushTokenInput): Promise<void> {
  try {
    const client = requireClient();
    const { token, platform } = pushTokenInputSchema.parse(input);
    await requireUserId(client);
    const { error } = await client.rpc('register_push_token', {
      p_token: token,
      p_platform: platform,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'push.registerPushToken' });
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const client = requireClient();
    await requireUserId(client);
    const { error } = await client.from('push_tokens').delete().eq('token', token);
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'push.unregisterPushToken' });
  }
}

/** Sem client, sessão ou linha salva devolve os defaults — mesmos da tela antes de persistir. */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const client = getConfiguredSupabase();
  if (!client) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const { data, error } = await client
      .from('notification_preferences')
      .select(PREFERENCES_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    const row = preferencesRowSchema.parse(data);
    return {
      channelEmail: row.channel_email,
      channelPush: row.channel_push,
      alertReviews: row.alert_reviews,
      alertMusicians: row.alert_musicians,
      alertEventStatus: row.alert_event_status,
      alertEmptySchedule: row.alert_empty_schedule,
      alertWeeklyDigest: row.alert_weekly_digest,
    };
  } catch (error) {
    return handleServiceError(error, { method: 'push.getNotificationPreferences' });
  }
}

/** Escrita coberta pelas policies own_*_notification_preferences (auth.uid() = user_id). */
export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    const client = requireClient();
    const prefs = notificationPreferencesSchema.parse(preferences);
    const userId = await requireUserId(client);
    const { error } = await client.from('notification_preferences').upsert(
      {
        user_id: userId,
        channel_email: prefs.channelEmail,
        channel_push: prefs.channelPush,
        alert_reviews: prefs.alertReviews,
        alert_musicians: prefs.alertMusicians,
        alert_event_status: prefs.alertEventStatus,
        alert_empty_schedule: prefs.alertEmptySchedule,
        alert_weekly_digest: prefs.alertWeeklyDigest,
      },
      { onConflict: 'user_id' },
    );
    if (error) {
      throw error;
    }
  } catch (error) {
    return handleServiceError(error, { method: 'push.saveNotificationPreferences' });
  }
}
