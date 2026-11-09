import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PREFIX,
  alertName,
  buildAlertPayload,
  buildInsights,
  buildReplayPatch,
  buildWebhookDestinations,
  decideUpsert,
  redactSecrets,
  resolveUserIds,
  validateEnv,
} from '../lib.mjs';
import { main } from '../setup.mjs';

const KEY = 'phx_secret_key_value';
const WEBHOOK = 'https://hooks.example.test/secret-path';

function capture() {
  const lines = [];
  const errors = [];
  return { lines, errors, out: (text) => lines.push(text), err: (text) => errors.push(text) };
}

function findInsight(insights, key) {
  return insights.find((insight) => insight.key === key);
}

function createFakePostHog({ failOn } = {}) {
  const store = { insights: [], dashboards: [], alerts: [], hog_functions: [] };
  const project = { id: 1, session_recording_opt_in: false, session_recording_sample_rate: '0.10' };
  const calls = [];
  let nextId = 1;

  const fetchImpl = async (url, init) => {
    const { pathname, searchParams } = new URL(url);
    const method = init.method;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, pathname, body, headers: init.headers });
    const respond = (data, status = 200) => ({
      ok: status < 400,
      status,
      text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
    });
    if (failOn && pathname.includes(failOn)) {
      return respond('{"detail":"boom"}', 400);
    }
    if (pathname.startsWith('/api/organizations/@current/projects/')) {
      if (method === 'PATCH') {
        Object.assign(project, body);
      }
      return respond(project);
    }
    if (pathname === '/api/organizations/@current/members/') {
      return respond({ results: [{ user: { id: 42, email: 'Dev@Example.test' } }], next: null });
    }
    const addInsight = pathname.match(/\/dashboards\/(\d+)\/add_insight\/$/);
    if (addInsight) {
      return respond({ id: nextId++ });
    }
    const match = pathname.match(/\/(insights|dashboards|alerts|hog_functions)\/(\d+)?\/?$/);
    const collection = store[match[1]];
    const offset = Number(searchParams.get('offset') ?? 0);
    if (method === 'GET') {
      return respond({ results: collection.slice(offset, offset + 100), next: null });
    }
    if (method === 'POST') {
      const created = { id: nextId++, ...body };
      collection.push(created);
      return respond(created, 201);
    }
    const target = collection.find((item) => item.id === Number(match[2]));
    Object.assign(target, body);
    return respond(target);
  };
  return { fetchImpl, store, calls, project };
}

describe('builders', () => {
  const insights = buildInsights({ channel: 'production' });

  it('prefixa todos os insights e usa TrendsQuery com filtro de channel', () => {
    assert.equal(insights.length, 9);
    for (const insight of insights) {
      assert.ok(insight.name.startsWith(PREFIX), insight.name);
      const source = insight.payload.query.source;
      assert.equal(source.kind, 'TrendsQuery');
      assert.deepEqual(source.properties, [
        { key: 'channel', type: 'event', operator: 'exact', value: ['production'] },
      ]);
    }
  });

  it('respeita o channel informado', () => {
    const [first] = buildInsights({ channel: 'preview' });
    assert.deepEqual(first.payload.query.source.properties[0].value, ['preview']);
  });

  it('gera breakdowns e filtros de propriedade corretos', () => {
    const source = (key) => findInsight(insights, key).payload.query.source;
    assert.equal(source('exception-by-app').breakdownFilter.breakdown, 'app_name');
    assert.equal(source('exception-by-error-type').breakdownFilter.breakdown, 'error_type');
    assert.equal(source('exception-by-app-version').breakdownFilter.breakdown, 'app_version');
    assert.equal(source('exception-by-ota-update').breakdownFilter.breakdown, 'ota_update_id');
    assert.equal(source('realtime-degraded').series[0].event, 'realtime_degraded');
    assert.equal(source('realtime-degraded').breakdownFilter.breakdown, 'status');
    assert.deepEqual(source('schema-drift').series[0].properties, [
      { key: '$exception_fingerprint', type: 'event', operator: 'icontains', value: 'zod-schema-drift' },
    ]);
    assert.equal(source('storage-failures').series[0].properties[0].operator, 'regex');
    assert.equal(source('storage-failures').series[0].properties[0].value, '^storage\\.');
    assert.equal(source('favorites-queue-dropped').series[0].properties[0].value, 'favorites-queue-dropped');
  });

  it('marca somente os 5 insights com alerta', () => {
    const alerted = insights.filter((insight) => insight.alertThreshold).map((insight) => insight.alertThreshold);
    assert.deepEqual(alerted.sort(), ['drift', 'exception', 'queue', 'realtime', 'storage']);
  });

  it('monta o alerta com threshold absoluto e usuários', () => {
    const payload = buildAlertPayload({ name: alertName(insights[0].name), insightId: 7, upper: 20, userIds: [1] });
    assert.ok(payload.name.startsWith(PREFIX));
    assert.equal(payload.insight, 7);
    assert.deepEqual(payload.subscribed_users, [1]);
    assert.deepEqual(payload.threshold, { configuration: { type: 'absolute', bounds: { upper: 20 } } });
    assert.deepEqual(payload.condition, { type: 'absolute_value' });
    assert.equal(payload.calculation_interval, 'hourly');
  });

  it('configura replay com gatilho em $exception', () => {
    assert.deepEqual(buildReplayPatch({ sampleRate: '0.50' }), {
      session_recording_opt_in: true,
      session_recording_sample_rate: '0.50',
      session_recording_event_trigger_config: ['$exception'],
    });
  });

  it('gera destinos de webhook somente com a URL', () => {
    assert.deepEqual(buildWebhookDestinations({ webhookUrl: undefined }), []);
    const [created, reopened] = buildWebhookDestinations({ webhookUrl: WEBHOOK });
    assert.equal(created.type, 'internal_destination');
    assert.equal(created.template_id, 'template-webhook');
    assert.equal(created.filters.events[0].id, '$error_tracking_issue_created');
    assert.deepEqual(created.filters.properties[0].value, ['production', 'preview']);
    assert.equal(reopened.filters.events[0].id, '$error_tracking_issue_reopened');
    assert.equal(reopened.filters.properties, undefined);
    assert.equal(created.inputs.url.value, WEBHOOK);
    assert.equal(redactSecrets(created).inputs.url.value, '***');
  });
});

describe('decideUpsert', () => {
  const desired = { name: `${PREFIX}x`, query: { a: 1 } };

  it('cria quando não existe', () => {
    assert.equal(decideUpsert({ existing: undefined, desired }).action, 'create');
  });

  it('pula quando o existente já contém o desejado', () => {
    const existing = { id: 1, name: desired.name, query: { a: 1, extra: true } };
    assert.deepEqual(decideUpsert({ existing, desired }), { action: 'skip', id: 1 });
  });

  it('atualiza quando difere', () => {
    const existing = { id: 1, name: desired.name, query: { a: 2 } };
    assert.equal(decideUpsert({ existing, desired }).action, 'update');
  });

  it('atualiza com force mesmo igual', () => {
    const existing = { id: 1, ...desired };
    assert.equal(decideUpsert({ existing, desired, force: true }).action, 'update');
  });

  it('compara só compareKeys', () => {
    const existing = { id: 1, name: desired.name, query: { a: 99 } };
    assert.equal(decideUpsert({ existing, desired, compareKeys: ['name'] }).action, 'skip');
  });
});

describe('env e usuários', () => {
  it('exige key e project id somente com --apply', () => {
    assert.deepEqual(validateEnv({}, { apply: false }), []);
    assert.deepEqual(validateEnv({}, { apply: true }), ['POSTHOG_PERSONAL_API_KEY', 'POSTHOG_PROJECT_ID']);
  });

  it('resolve e-mails em ids sem diferenciar maiúsculas', () => {
    const members = [{ user: { id: 42, email: 'Dev@Example.test' } }];
    assert.deepEqual(resolveUserIds(members, ['dev@example.test', 'x@y.test']), {
      ids: [42],
      missing: ['x@y.test'],
    });
  });
});

describe('main', () => {
  const noFetch = () => {
    throw new Error('fetch não deve ser chamado');
  };

  it('--help imprime ajuda em pt-BR e escopos', async () => {
    const io = capture();
    const code = await main({ argv: ['--help'], env: {}, fetchImpl: noFetch, ...io });
    assert.equal(code, 0);
    assert.match(io.lines.join('\n'), /alert:write/);
    assert.match(io.lines.join('\n'), /hog_function:write/);
  });

  it('dry-run não chama fetch, funciona sem key e imprime o plano', async () => {
    const io = capture();
    const code = await main({
      argv: [],
      env: { POSTHOG_ALERT_WEBHOOK_URL: WEBHOOK },
      fetchImpl: noFetch,
      ...io,
    });
    const output = io.lines.join('\n');
    assert.equal(code, 0);
    assert.match(output, /dry-run/);
    assert.match(output, /\[Agenda\] \$exception total/);
    assert.match(output, /Saúde de erros/);
    assert.ok(!output.includes(WEBHOOK), 'a URL do webhook não pode ser impressa');
  });

  it('dry-run sem webhook pula os destinos e indica passo manual', async () => {
    const io = capture();
    await main({ argv: [], env: {}, fetchImpl: noFetch, ...io });
    const output = io.lines.join('\n');
    assert.match(output, /POSTHOG_ALERT_WEBHOOK_URL ausente/);
    assert.match(output, /MANUAL:/);
  });

  it('--apply sem envs obrigatórias falha sem chamar fetch', async () => {
    const io = capture();
    const code = await main({ argv: ['--apply'], env: {}, fetchImpl: noFetch, ...io });
    assert.equal(code, 2);
    assert.match(io.errors.join('\n'), /POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID/);
  });

  it('rejeita flag desconhecida e threshold inválido', async () => {
    const unknown = capture();
    assert.equal(await main({ argv: ['--nope'], env: {}, fetchImpl: noFetch, ...unknown }), 2);
    const invalid = capture();
    assert.equal(
      await main({ argv: ['--threshold-drift', 'abc'], env: {}, fetchImpl: noFetch, ...invalid }),
      2,
    );
  });

  it('--apply cria tudo e a segunda execução não cria nem atualiza nada', async () => {
    const fake = createFakePostHog();
    const env = {
      POSTHOG_PERSONAL_API_KEY: KEY,
      POSTHOG_PROJECT_ID: '1',
      POSTHOG_ALERT_WEBHOOK_URL: WEBHOOK,
      POSTHOG_ALERT_USER_EMAILS: 'dev@example.test',
    };
    const first = capture();
    assert.equal(await main({ argv: ['--apply'], env, fetchImpl: fake.fetchImpl, ...first }), 0);
    assert.equal(fake.store.insights.length, 9);
    assert.equal(fake.store.dashboards.length, 1);
    assert.equal(fake.store.alerts.length, 5);
    assert.equal(fake.store.hog_functions.length, 2);
    assert.deepEqual(fake.store.alerts[0].subscribed_users, [42]);
    assert.equal(fake.project.session_recording_opt_in, true);
    assert.ok(fake.calls.every((call) => call.headers.Authorization === `Bearer ${KEY}`));

    const callsBefore = fake.calls.length;
    const second = capture();
    assert.equal(await main({ argv: ['--apply'], env, fetchImpl: fake.fetchImpl, ...second }), 0);
    const writes = fake.calls
      .slice(callsBefore)
      .filter((call) => call.method !== 'GET' && !call.pathname.endsWith('/add_insight/'));
    assert.deepEqual(writes, []);
    assert.equal(fake.store.insights.length, 9);
    assert.equal(fake.store.alerts.length, 5);
    assert.ok(!first.lines.concat(second.lines, first.errors).join('\n').includes(KEY));
  });

  it('erro HTTP retorna exit 1 com status e corpo, sem a key', async () => {
    const fake = createFakePostHog({ failOn: '/insights/' });
    const io = capture();
    const code = await main({
      argv: ['--apply'],
      env: { POSTHOG_PERSONAL_API_KEY: KEY, POSTHOG_PROJECT_ID: '1' },
      fetchImpl: fake.fetchImpl,
      ...io,
    });
    const errors = io.errors.join('\n');
    assert.equal(code, 1);
    assert.match(errors, /HTTP 400/);
    assert.match(errors, /boom/);
    assert.ok(!errors.includes(KEY));
  });
});
