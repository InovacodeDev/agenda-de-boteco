export const PREFIX = '[Agenda] ';
export const DASHBOARD_NAME = `${PREFIX}Saúde de erros`;
export const DEFAULT_HOST = 'https://us.posthog.com';
export const DEFAULT_CHANNEL = 'production';
export const REPLAY_EVENT_TRIGGER = '$exception';

export const DEFAULT_THRESHOLDS = Object.freeze({
  exception: 20,
  drift: 1,
  storage: 3,
  realtime: 10,
  queue: 1,
});

const TAGS = ['agenda', 'posthog-setup'];

export function validateEnv(env, { apply }) {
  if (!apply) {
    return [];
  }
  const missing = [];
  if (!env.POSTHOG_PERSONAL_API_KEY) {
    missing.push('POSTHOG_PERSONAL_API_KEY');
  }
  if (!env.POSTHOG_PROJECT_ID) {
    missing.push('POSTHOG_PROJECT_ID');
  }
  return missing;
}

export function resolveHost(env) {
  return (env.POSTHOG_HOST || DEFAULT_HOST).replace(/\/+$/, '');
}

export function parseEmails(raw) {
  return (raw ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function prefixed(name) {
  return `${PREFIX}${name}`;
}

export function eventProperty(key, operator, value) {
  const filter = { key, type: 'event', operator };
  return value === undefined ? filter : { ...filter, value };
}

export function channelFilter(channel) {
  return eventProperty('channel', 'exact', [channel]);
}

function eventsNode({ event, properties, customName }) {
  return {
    kind: 'EventsNode',
    event,
    name: event,
    custom_name: customName,
    math: 'total',
    ...(properties?.length ? { properties } : {}),
  };
}

export function trendsInsight({
  name,
  description,
  event,
  properties = [],
  breakdown,
  interval = 'hour',
  dateFrom = '-24h',
  channel,
  display = 'ActionsLineGraph',
}) {
  return {
    name: prefixed(name),
    description,
    tags: TAGS,
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'TrendsQuery',
        series: [eventsNode({ event, properties, customName: name })],
        interval,
        dateRange: { date_from: dateFrom },
        properties: [channelFilter(channel)],
        filterTestAccounts: false,
        ...(breakdown ? { breakdownFilter: { breakdown, breakdown_type: 'event' } } : {}),
        trendsFilter: { display },
      },
    },
  };
}

const DRIFT_FINGERPRINT = 'zod-schema-drift';
const QUEUE_DROPPED_FINGERPRINT = 'favorites-queue-dropped';

export function buildInsights({ channel }) {
  const exception = (extra) => ({ event: '$exception', channel, ...extra });
  const definitions = [
    {
      key: 'exception-total',
      alertThreshold: 'exception',
      payload: trendsInsight(
        exception({
          name: '$exception total',
          description: 'Volume total de exceções por hora.',
        }),
      ),
    },
    {
      key: 'exception-by-app',
      payload: trendsInsight(
        exception({
          name: '$exception por app_name',
          description: 'Exceções por app (@agenda/*).',
          breakdown: 'app_name',
        }),
      ),
    },
    {
      key: 'exception-by-error-type',
      payload: trendsInsight(
        exception({
          name: '$exception por error_type',
          description: 'Exceções por classe de erro (ZodValidationError, PostgrestDatabaseError...).',
          breakdown: 'error_type',
        }),
      ),
    },
    {
      key: 'exception-by-app-version',
      payload: trendsInsight(
        exception({
          name: '$exception por app_version',
          description: 'Detecta regressão por release.',
          breakdown: 'app_version',
          interval: 'day',
          dateFrom: '-14d',
        }),
      ),
    },
    {
      key: 'schema-drift',
      alertThreshold: 'drift',
      payload: trendsInsight(
        exception({
          name: 'Drift de schema (zod-schema-drift)',
          description: 'Exceções com fingerprint zod-schema-drift, por method.',
          properties: [eventProperty('$exception_fingerprint', 'icontains', DRIFT_FINGERPRINT)],
          breakdown: 'method',
        }),
      ),
    },
    {
      key: 'storage-failures',
      alertThreshold: 'storage',
      payload: trendsInsight(
        exception({
          name: 'Falhas de storage',
          description: 'Exceções cujo method começa com storage.',
          properties: [eventProperty('method', 'regex', '^storage\\.')],
          breakdown: 'method',
        }),
      ),
    },
    {
      key: 'favorites-queue-dropped',
      alertThreshold: 'queue',
      payload: trendsInsight(
        exception({
          name: 'favorites-queue-dropped',
          description: 'Operações da fila de favoritos descartadas.',
          properties: [
            eventProperty('$exception_fingerprint', 'icontains', QUEUE_DROPPED_FINGERPRINT),
          ],
        }),
      ),
    },
    {
      key: 'realtime-degraded',
      alertThreshold: 'realtime',
      payload: trendsInsight({
        name: 'realtime_degraded por status',
        description: 'Canais realtime em CHANNEL_ERROR ou TIMED_OUT.',
        event: 'realtime_degraded',
        breakdown: 'status',
        channel,
      }),
    },
    {
      key: 'exception-by-ota-update',
      payload: trendsInsight(
        exception({
          name: '$exception por ota_update_id (mobile)',
          description: 'Exceções no mobile por update OTA.',
          properties: [eventProperty('platform', 'exact', ['ios', 'android'])],
          breakdown: 'ota_update_id',
          interval: 'day',
          dateFrom: '-14d',
        }),
      ),
    },
  ];
  return definitions.map((definition) => ({ ...definition, name: definition.payload.name }));
}

export function buildDashboardPayload() {
  return {
    name: DASHBOARD_NAME,
    description: 'Erros, drift de schema, storage, realtime e releases. Gerado por scripts/posthog/setup.mjs.',
    tags: TAGS,
    pinned: true,
  };
}

export function buildAlertPayload({ name, insightId, upper, userIds }) {
  return {
    name,
    insight: insightId,
    enabled: true,
    subscribed_users: userIds,
    condition: { type: 'absolute_value' },
    threshold: { configuration: { type: 'absolute', bounds: { upper } } },
    config: { type: 'TrendsAlertConfig', series_index: 0, check_ongoing_interval: true },
    calculation_interval: 'hourly',
  };
}

export function alertName(insightName) {
  return prefixed(`Alerta - ${insightName.slice(PREFIX.length)}`);
}

const ISSUE_DESTINATIONS = [
  { key: 'created', event: '$error_tracking_issue_created', label: 'issue criada', filterChannels: true },
  { key: 'reopened', event: '$error_tracking_issue_reopened', label: 'issue reaberta', filterChannels: false },
];

export function buildWebhookDestinations({ webhookUrl, channels = ['production', 'preview'] }) {
  if (!webhookUrl) {
    return [];
  }
  return ISSUE_DESTINATIONS.map(({ event, label, filterChannels }) => ({
    name: prefixed(`Error Tracking - ${label} (webhook)`),
    type: 'internal_destination',
    template_id: 'template-webhook',
    enabled: true,
    description: `Notifica o webhook quando uma ${label}. Gerado por scripts/posthog/setup.mjs.`,
    filters: {
      events: [{ id: event, type: 'events' }],
      ...(filterChannels ? { properties: [eventProperty('channel', 'exact', channels)] } : {}),
    },
    inputs: {
      url: { value: webhookUrl },
      method: { value: 'POST' },
      headers: { value: { 'Content-Type': 'application/json' } },
      body: {
        value: {
          text: `[Agenda] ${label}: {event.properties.name}`,
          event: event,
          issue_id: '{event.distinct_id}',
          name: '{event.properties.name}',
          description: '{event.properties.description}',
          app_name: '{event.properties.app_name}',
          channel: '{event.properties.channel}',
        },
      },
    },
  }));
}

export function buildReplayPatch({ sampleRate = '1.00' } = {}) {
  return {
    session_recording_opt_in: true,
    session_recording_sample_rate: sampleRate,
    session_recording_event_trigger_config: [REPLAY_EVENT_TRIGGER],
  };
}

export function isSubset(desired, actual) {
  if (Array.isArray(desired)) {
    return (
      Array.isArray(actual) &&
      desired.length === actual.length &&
      desired.every((item, index) => isSubset(item, actual[index]))
    );
  }
  if (desired && typeof desired === 'object') {
    return (
      actual !== null &&
      typeof actual === 'object' &&
      Object.entries(desired).every(([key, value]) => isSubset(value, actual[key]))
    );
  }
  return desired === actual;
}

export function findByName(items, name) {
  return items.find((item) => item.name === name);
}

export function decideUpsert({ existing, desired, compareKeys, force = false }) {
  if (!existing) {
    return { action: 'create', payload: desired };
  }
  const keys = compareKeys ?? Object.keys(desired);
  const subset = Object.fromEntries(keys.map((key) => [key, desired[key]]));
  if (!force && isSubset(subset, existing)) {
    return { action: 'skip', id: existing.id };
  }
  return { action: 'update', id: existing.id, payload: desired };
}

export function normalizeAlert(alert) {
  return {
    ...alert,
    insight: typeof alert.insight === 'object' && alert.insight ? alert.insight.id : alert.insight,
    subscribed_users: (alert.subscribed_users ?? []).map((user) =>
      typeof user === 'object' ? user.id : user,
    ),
  };
}

export function redactSecrets(payload) {
  if (!payload.inputs?.url) {
    return payload;
  }
  return { ...payload, inputs: { ...payload.inputs, url: { value: '***' } } };
}

export function resolveUserIds(members, emails) {
  const byEmail = new Map(members.map((member) => [member.user?.email?.toLowerCase(), member.user?.id]));
  const ids = [];
  const missing = [];
  for (const email of emails) {
    const id = byEmail.get(email);
    if (id === undefined) {
      missing.push(email);
    } else {
      ids.push(id);
    }
  }
  return { ids, missing };
}
