import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BUCKET_ALERT_BYTES, planPrune } from '../lib/prune.mjs';

const NOW = new Date('2026-11-07T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function makeRow({
  id,
  app_slug = 'agenda-de-boteco',
  channel = 'production',
  platform = 'ios',
  runtime_version = 'rt-current',
  kind = 'update',
  asset_prefix = `ota/${app_slug}/${channel}/${runtime_version}/${id}/`,
  created_at = daysAgo(1),
}) {
  return {
    id,
    app_slug,
    channel,
    platform,
    runtime_version,
    kind,
    asset_prefix: kind === 'rollback_embedded' ? null : asset_prefix,
    created_at,
  };
}

describe('planPrune', () => {
  it('exposes BUCKET_ALERT_BYTES = 1.5 GiB', () => {
    assert.equal(BUCKET_ALERT_BYTES, 1.5 * 1024 ** 3);
  });

  it('prunes the 2 oldest releases when 5 exist in the same production runtime', () => {
    const rows = [
      makeRow({ id: 'r5', created_at: daysAgo(1) }),
      makeRow({ id: 'r4', created_at: daysAgo(2) }),
      makeRow({ id: 'r3', created_at: daysAgo(3) }),
      makeRow({ id: 'r2', created_at: daysAgo(4) }),
      makeRow({ id: 'r1', created_at: daysAgo(5) }),
    ];

    const plan = planPrune(rows, { now: NOW });
    assert.deepEqual(plan.pruneReleaseIds, ['r2', 'r1']);
    assert.deepEqual(plan.deletePrefixes, [
      'ota/agenda-de-boteco/production/rt-current/r2/',
      'ota/agenda-de-boteco/production/rt-current/r1/',
    ]);
    assert.deepEqual(plan.retireRuntimes, []);
  });

  it('preserves shared asset_prefix when a kept rollback release references a pruned release prefix', () => {
    const sharedPrefix = 'ota/agenda-de-boteco/production/rt-current/r1/';
    const rows = [
      makeRow({ id: 'r5-rollback-to-r1', created_at: daysAgo(1), asset_prefix: sharedPrefix }),
      makeRow({ id: 'r4', created_at: daysAgo(2) }),
      makeRow({ id: 'r3', created_at: daysAgo(3) }),
      makeRow({ id: 'r2', created_at: daysAgo(4) }),
      makeRow({ id: 'r1', created_at: daysAgo(5), asset_prefix: sharedPrefix }),
    ];

    const plan = planPrune(rows, { now: NOW });
    assert.deepEqual(plan.pruneReleaseIds, ['r2', 'r1']);
    assert.deepEqual(plan.deletePrefixes, ['ota/agenda-de-boteco/production/rt-current/r2/']);
  });

  it('retires older runtime inactive for > 90 days when a newer runtime exists, but never retires the newest runtime', () => {
    const rows = [
      makeRow({ id: 'new-1', runtime_version: 'rt-new', created_at: daysAgo(95) }),
      makeRow({ id: 'old-2', runtime_version: 'rt-old', created_at: daysAgo(100) }),
      makeRow({ id: 'old-1', runtime_version: 'rt-old', created_at: daysAgo(110) }),
    ];

    const plan = planPrune(rows, { now: NOW });
    assert.deepEqual(plan.retireRuntimes, [
      {
        app_slug: 'agenda-de-boteco',
        channel: 'production',
        platform: 'ios',
        runtime_version: 'rt-old',
      },
    ]);
    assert.deepEqual(plan.pruneReleaseIds, ['old-2', 'old-1']);
    assert.deepEqual(plan.deletePrefixes, [
      'ota/agenda-de-boteco/production/rt-old/old-2/',
      'ota/agenda-de-boteco/production/rt-old/old-1/',
    ]);
  });

  it('does not generate deletePrefixes for rollback_embedded or alfa/beta expired rows', () => {
    const rows = [
      makeRow({ id: 'p4', created_at: daysAgo(1) }),
      makeRow({ id: 'p3', created_at: daysAgo(2) }),
      makeRow({ id: 'p2', created_at: daysAgo(3) }),
      makeRow({ id: 'p1-embedded', kind: 'rollback_embedded', created_at: daysAgo(4) }),
      makeRow({ id: 'alfa-old', channel: 'alfa', created_at: daysAgo(35) }),
      makeRow({ id: 'alfa-fresh', channel: 'alfa', created_at: daysAgo(10) }),
    ];

    const plan = planPrune(rows, { now: NOW });
    assert.deepEqual(plan.pruneReleaseIds.sort(), ['alfa-old', 'p1-embedded']);
    assert.deepEqual(plan.deletePrefixes, []);
  });
});
