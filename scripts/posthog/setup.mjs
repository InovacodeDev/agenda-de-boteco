// NOTE: campos e endpoints confirmados no OpenAPI oficial https://us.posthog.com/api/schema/ (insights, dashboards add_insight, alerts, hog_functions, organizations/projects).
// NOTE: docs consultadas: https://posthog.com/docs/api/insights, /alerts, /dashboards, /projects e https://posthog.com/docs/error-tracking/alerts.
// NOTE: destinos de issue criada/reaberta = hog_function internal_destination com eventos $error_tracking_issue_created/_reopened (skill authoring-error-tracking-alerts, repo PostHog/posthog).
// NOTE: template-webhook confirmado em PostHog/posthog nodejs/src/cdp/templates/_destinations/webhook/webhook.template.ts.
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  DASHBOARD_NAME,
  DEFAULT_CHANNEL,
  DEFAULT_HOST,
  DEFAULT_THRESHOLDS,
  alertName,
  buildAlertPayload,
  buildDashboardPayload,
  buildInsights,
  buildReplayPatch,
  buildWebhookDestinations,
  decideUpsert,
  findByName,
  normalizeAlert,
  parseEmails,
  redactSecrets,
  resolveHost,
  resolveUserIds,
  validateEnv,
} from './lib.mjs';

const PAGE_SIZE = 100;
const PROJECT_PLACEHOLDER = '<POSTHOG_PROJECT_ID>';

const HELP = `Uso: node scripts/posthog/setup.mjs [--apply] [opções]

Provisiona no PostHog insights, dashboard, alertas, destinos de Error Tracking e
Session Replay para analisar erros do Agenda de Boteco. Todos os recursos levam o
prefixo "[Agenda] " e são atualizados por nome (idempotente, sem duplicar).

Modo padrão: dry-run. Imprime o plano e os payloads, sem chamar a API e sem exigir key.
Com --apply: lista cada recurso por nome (paginando) e então cria, atualiza ou pula.

Opções:
  --apply                      Executa de verdade contra a API do PostHog.
  --channel <nome>             Filtra os insights por "channel" (padrão: ${DEFAULT_CHANNEL}).
  --threshold-exception <n>    Alerta de $exception total: > n por hora (padrão: ${DEFAULT_THRESHOLDS.exception}).
  --threshold-drift <n>        Alerta de drift de schema (padrão: ${DEFAULT_THRESHOLDS.drift}).
  --threshold-storage <n>      Alerta de falhas de storage (padrão: ${DEFAULT_THRESHOLDS.storage}).
  --threshold-realtime <n>     Alerta de realtime_degraded (padrão: ${DEFAULT_THRESHOLDS.realtime}).
  --threshold-queue <n>        Alerta de favorites-queue-dropped (padrão: ${DEFAULT_THRESHOLDS.queue}).
  --replay-sample-rate <0-1>   Fração de sessões gravadas após um $exception (padrão: 1.00).
  --force                      Atualiza mesmo quando o recurso já parece igual (use ao trocar a URL do webhook,
                               que a listagem da API não devolve).
  --help                       Mostra esta ajuda.

Variáveis de ambiente (exporte no shell; o script nunca lê arquivos .env):
  POSTHOG_PERSONAL_API_KEY     Obrigatória com --apply. Nunca é impressa.
  POSTHOG_PROJECT_ID           Obrigatória com --apply.
  POSTHOG_HOST                 Opcional. Padrão ${DEFAULT_HOST} (use https://eu.posthog.com na UE).
  POSTHOG_ALERT_WEBHOOK_URL    Opcional. Sem ela, os destinos de Error Tracking não são criados.
  POSTHOG_ALERT_USER_EMAILS    Opcional. E-mails (separados por vírgula) de membros da organização
                               que recebem os alertas de insight por e-mail.

Escopos da Personal API Key (Settings > Personal API keys):
  insight:read, insight:write, dashboard:read, dashboard:write, alert:read, alert:write,
  hog_function:read, hog_function:write, project:read, project:write
  e organization_member:read (somente se POSTHOG_ALERT_USER_EMAILS estiver definida).

O que é criado:
  9 insights de tendência ([Agenda] $exception total, por app_name, error_type, app_version, drift de
  schema, falhas de storage, favorites-queue-dropped, realtime_degraded por status, por ota_update_id),
  o dashboard "${DASHBOARD_NAME}", 5 alertas de insight (total, drift, storage, realtime, queue),
  2 destinos webhook de Error Tracking (issue criada em production/preview; issue reaberta) e a
  configuração de Session Replay com gatilho no evento $exception.
`;

function parseThreshold(raw, fallback, flag) {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Valor inválido para ${flag}: "${raw}". Use um número >= 0.`);
  }
  return value;
}

function parseOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      apply: { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
      channel: { type: 'string', default: DEFAULT_CHANNEL },
      'threshold-exception': { type: 'string' },
      'threshold-drift': { type: 'string' },
      'threshold-storage': { type: 'string' },
      'threshold-realtime': { type: 'string' },
      'threshold-queue': { type: 'string' },
      'replay-sample-rate': { type: 'string', default: '1.00' },
    },
  });
  const sampleRate = Number(values['replay-sample-rate']);
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    throw new Error(`Valor inválido para --replay-sample-rate: "${values['replay-sample-rate']}". Use 0 a 1.`);
  }
  const thresholds = {
    exception: parseThreshold(values['threshold-exception'], DEFAULT_THRESHOLDS.exception, '--threshold-exception'),
    drift: parseThreshold(values['threshold-drift'], DEFAULT_THRESHOLDS.drift, '--threshold-drift'),
    storage: parseThreshold(values['threshold-storage'], DEFAULT_THRESHOLDS.storage, '--threshold-storage'),
    realtime: parseThreshold(values['threshold-realtime'], DEFAULT_THRESHOLDS.realtime, '--threshold-realtime'),
    queue: parseThreshold(values['threshold-queue'], DEFAULT_THRESHOLDS.queue, '--threshold-queue'),
  };
  return {
    apply: values.apply,
    force: values.force,
    help: values.help,
    channel: values.channel,
    thresholds,
    sampleRate: sampleRate.toFixed(2),
  };
}

function createClient({ host, key, fetchImpl }) {
  async function request(method, path, body) {
    const response = await fetchImpl(`${host}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      const safeBody = text.split(key).join('***').slice(0, 1000);
      throw new Error(`HTTP ${response.status} em ${method} ${path}: ${safeBody}`);
    }
    return text ? JSON.parse(text) : null;
  }

  async function listAll(path, params = {}) {
    const items = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const query = new URLSearchParams({ ...params, limit: String(PAGE_SIZE), offset: String(offset) });
      const page = await request('GET', `${path}?${query}`);
      items.push(...page.results);
      if (!page.next || page.results.length === 0) {
        return items;
      }
    }
  }

  return { request, listAll };
}

function printPayload(out, payload) {
  out(JSON.stringify(redactSecrets(payload), null, 2));
}

async function run({ options, env, fetchImpl, out }) {
  const { apply, force, channel, thresholds } = options;
  const projectId = encodeURIComponent(env.POSTHOG_PROJECT_ID || PROJECT_PLACEHOLDER);
  const base = `/api/projects/${projectId}`;
  const orgProject = `/api/organizations/@current/projects/${projectId}/`;
  const client = apply
    ? createClient({ host: resolveHost(env), key: env.POSTHOG_PERSONAL_API_KEY, fetchImpl })
    : null;
  const lists = new Map();
  const listCached = async (cacheKey, path, params) => {
    if (!lists.has(cacheKey)) {
      lists.set(cacheKey, await client.listAll(path, params));
    }
    return lists.get(cacheKey);
  };

  async function upsert({ kind, desired, listKey, listPath, listParams, createPath, updatePath, compareKeys, normalize }) {
    if (!apply) {
      out(`[plano] ${kind} "${desired.name}": criar ou atualizar por nome`);
      printPayload(out, desired);
      return {};
    }
    const items = (await listCached(listKey, listPath, listParams)).map(normalize ?? ((item) => item));
    const decision = decideUpsert({ existing: findByName(items, desired.name), desired, compareKeys, force });
    out(`[${decision.action}] ${kind} "${desired.name}"`);
    if (decision.action === 'create') {
      const created = await client.request('POST', createPath, desired);
      lists.delete(listKey);
      return created;
    }
    if (decision.action === 'update') {
      const { type: _type, template_id: _templateId, ...patch } = desired;
      return client.request('PATCH', updatePath(decision.id), patch);
    }
    return { id: decision.id };
  }

  out(`Modo: ${apply ? 'APPLY (executa na API)' : 'dry-run (nada é enviado; use --apply)'}`);

  out('\n== Session Replay (gatilho por $exception) ==');
  const replayPatch = buildReplayPatch({ sampleRate: options.sampleRate });
  if (apply) {
    const project = await client.request('GET', orgProject);
    const decision = decideUpsert({ existing: project, desired: replayPatch, force });
    out(`[${decision.action}] projeto session replay`);
    if (decision.action === 'update') {
      await client.request('PATCH', orgProject, replayPatch);
    }
  } else {
    out(`[plano] PATCH ${orgProject}`);
    printPayload(out, replayPatch);
  }

  out('\n== Insights ==');
  const insights = buildInsights({ channel });
  const insightIds = new Map();
  for (const insight of insights) {
    const result = await upsert({
      kind: 'insight',
      desired: insight.payload,
      listKey: 'insights',
      listPath: `${base}/insights/`,
      listParams: { search: '[Agenda]', basic: 'true' },
      createPath: `${base}/insights/`,
      updatePath: (id) => `${base}/insights/${id}/`,
      compareKeys: ['name', 'description', 'query'],
    });
    insightIds.set(insight.key, result.id);
  }

  out('\n== Dashboard ==');
  const dashboard = await upsert({
    kind: 'dashboard',
    desired: buildDashboardPayload(),
    listKey: 'dashboards',
    listPath: `${base}/dashboards/`,
    listParams: { search: '[Agenda]' },
    createPath: `${base}/dashboards/`,
    updatePath: (id) => `${base}/dashboards/${id}/`,
    compareKeys: ['name', 'description'],
  });
  if (apply) {
    for (const insight of insights) {
      await client.request('POST', `${base}/dashboards/${dashboard.id}/add_insight/`, {
        insight_id: insightIds.get(insight.key),
      });
    }
    out(`[ok] ${insights.length} insights associados a "${DASHBOARD_NAME}" (add_insight é idempotente)`);
  } else {
    out(`[plano] POST ${base}/dashboards/<id>/add_insight/ para cada um dos ${insights.length} insights`);
  }

  out('\n== Alertas de insight ==');
  const emails = parseEmails(env.POSTHOG_ALERT_USER_EMAILS);
  let userIds = [];
  if (emails.length > 0 && apply) {
    const members = await client.listAll('/api/organizations/@current/members/');
    const resolved = resolveUserIds(members, emails);
    userIds = resolved.ids;
    for (const email of resolved.missing) {
      out(`[aviso] e-mail sem membro correspondente na organização, ignorado: ${email}`);
    }
  } else if (emails.length > 0) {
    out(`[plano] resolver ${emails.length} e-mail(s) em ids via /api/organizations/@current/members/`);
  }
  for (const insight of insights.filter((item) => item.alertThreshold)) {
    const desired = buildAlertPayload({
      name: alertName(insight.name),
      insightId: apply ? insightIds.get(insight.key) : `<id de "${insight.name}">`,
      upper: thresholds[insight.alertThreshold],
      userIds,
    });
    await upsert({
      kind: 'alerta',
      desired,
      listKey: 'alerts',
      listPath: `${base}/alerts/`,
      listParams: { search: '[Agenda]' },
      createPath: `${base}/alerts/`,
      updatePath: (id) => `${base}/alerts/${id}/`,
      compareKeys: ['name', 'insight', 'enabled', 'subscribed_users', 'condition', 'threshold', 'config', 'calculation_interval'],
      normalize: normalizeAlert,
    });
  }

  out('\n== Destinos de Error Tracking (webhook) ==');
  const destinations = buildWebhookDestinations({ webhookUrl: env.POSTHOG_ALERT_WEBHOOK_URL });
  if (destinations.length === 0) {
    out('[pulado] POSTHOG_ALERT_WEBHOOK_URL ausente: nenhum destino criado.');
  }
  for (const destination of destinations) {
    await upsert({
      kind: 'destino',
      desired: destination,
      listKey: 'hog_functions',
      listPath: `${base}/hog_functions/`,
      listParams: { type: 'internal_destination' },
      createPath: `${base}/hog_functions/`,
      updatePath: (id) => `${base}/hog_functions/${id}/`,
      compareKeys: ['name', 'enabled', 'filters'],
    });
  }

  out('\n== Passos MANUAIS (o script não faz) ==');
  if (destinations.length === 0) {
    out('MANUAL: Error tracking > Configuration > Alerting > New notification (HTTP Webhook) para "issue criada" e "issue reaberta".');
  }
  out('MANUAL: Slack nativo exige uma integração Slack do projeto (endpoint error_tracking/alerts só aceita Slack); use a UI se quiser Slack em vez de webhook.');
  out('MANUAL: alertas de "issue spiking" não são criados; configure em Error tracking > Configuration se desejar.');
  out('MANUAL: confira em Session replay > Settings que o gatilho por evento "$exception" aparece e que o posthog-js do app suporta event triggers.');
  out('MANUAL: confira que super properties (app_name, app_version, channel, platform, ota_update_id) chegam nos eventos antes de confiar nos filtros por channel.');
}

export async function main({ argv, env, fetchImpl = fetch, out = console.log, err = console.error }) {
  let options;
  try {
    options = parseOptions(argv);
  } catch (error) {
    err(error.message);
    err('Use --help para ver as opções.');
    return 2;
  }
  if (options.help) {
    out(HELP);
    return 0;
  }
  const missing = validateEnv(env, { apply: options.apply });
  if (missing.length > 0) {
    err(`Variáveis de ambiente obrigatórias com --apply ausentes: ${missing.join(', ')}.`);
    return 2;
  }
  try {
    await run({ options, env, fetchImpl, out });
    return 0;
  } catch (error) {
    err(`Falha: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main({ argv: process.argv.slice(2), env: process.env });
}
