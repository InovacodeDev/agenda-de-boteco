import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

const ALERT_COLUMN_BY_KIND = {
  reviews: 'alert_reviews',
  musicians: 'alert_musicians',
  event_status: 'alert_event_status',
  empty_schedule: 'alert_empty_schedule',
  weekly_digest: 'alert_weekly_digest',
} as const;

type Kind = keyof typeof ALERT_COLUMN_BY_KIND;

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  kind: Kind;
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && value in ALERT_COLUMN_BY_KIND;
}

function isInternalPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.includes('://')
  );
}

function parseRequest(raw: unknown): PushRequest | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { user_id, title, body, url, kind } = raw as Record<string, unknown>;
  if (typeof user_id !== 'string' || !UUID_PATTERN.test(user_id)) return null;
  if (typeof title !== 'string' || title.length === 0 || title.length > 120) return null;
  if (typeof body !== 'string' || body.length === 0 || body.length > 500) return null;
  if (!isKind(kind)) return null;
  if (url !== undefined && !isInternalPath(url)) return null;
  return { user_id, title, body, url, kind };
}

/** Comparação em tempo constante para não vazar o segredo por timing. */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'misconfigured' });
  }

  const authorization = req.headers.get('Authorization') ?? '';
  if (!safeEqual(authorization, `Bearer ${serviceRoleKey}`)) {
    return json(401, { error: 'unauthorized' });
  }

  const payload = parseRequest(await req.json().catch(() => null));
  if (!payload) {
    return json(400, { error: 'invalid_payload' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const alertColumn = ALERT_COLUMN_BY_KIND[payload.kind];
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_preferences')
    .select(`channel_push, ${alertColumn}`)
    .eq('user_id', payload.user_id)
    .maybeSingle();
  if (prefsError) {
    return json(500, { error: 'preferences_lookup_failed' });
  }

  const row = (prefs ?? null) as Record<string, unknown> | null;
  const channelPush = row ? row.channel_push === true : true;
  const alertEnabled = row ? row[alertColumn] === true : payload.kind !== 'weekly_digest';
  if (!channelPush || !alertEnabled) {
    return json(200, { sent: 0, skipped: 'preferences' });
  }

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', payload.user_id);
  if (tokensError) {
    return json(500, { error: 'tokens_lookup_failed' });
  }

  const allTokens = (tokens ?? []).map((t: { token: string }) => t.token);
  const staleTokens: string[] = [];
  let sent = 0;

  for (let start = 0; start < allTokens.length; start += BATCH_SIZE) {
    const batch = allTokens.slice(start, start + BATCH_SIZE);
    const messages = batch.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'default',
      data: payload.url ? { url: payload.url } : {},
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      return json(502, { error: 'expo_push_failed', sent });
    }

    const result = (await response.json()) as { data?: ExpoTicket[] };
    (result.data ?? []).forEach((ticket, index) => {
      const token = batch[index];
      if (ticket.status === 'ok') {
        sent += 1;
      } else if (ticket.details?.error === 'DeviceNotRegistered' && token) {
        staleTokens.push(token);
      }
    });
  }

  if (staleTokens.length === 0) {
    return json(200, { sent, removed: 0 });
  }
  const { error: cleanupError } = await supabase
    .from('push_tokens')
    .delete()
    .in('token', staleTokens);
  if (cleanupError) {
    return json(500, { error: 'stale_token_cleanup_failed', sent });
  }
  return json(200, { sent, removed: staleTokens.length });
});
