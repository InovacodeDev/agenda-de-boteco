import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRollbackRow } from '../lib/rollback.mjs';

const sampleRows = [
  {
    id: 'rel-3',
    app_slug: 'agenda-de-boteco',
    channel: 'production',
    platform: 'ios',
    runtime_version: 'rt-1',
    kind: 'update',
    asset_prefix: 'ota/agenda-de-boteco/production/rt-1/rel-3/',
    manifest: { launchAsset: { key: 'k3' }, assets: [], metadata: {} },
    created_at: '2026-11-07T12:00:00.000Z',
  },
  {
    id: 'rel-2',
    app_slug: 'agenda-de-boteco',
    channel: 'production',
    platform: 'ios',
    runtime_version: 'rt-1',
    kind: 'update',
    asset_prefix: 'ota/agenda-de-boteco/production/rt-1/rel-2/',
    manifest: { launchAsset: { key: 'k2' }, assets: [], metadata: {} },
    created_at: '2026-11-06T12:00:00.000Z',
  },
  {
    id: 'rel-1',
    app_slug: 'agenda-de-boteco',
    channel: 'production',
    platform: 'ios',
    runtime_version: 'rt-1',
    kind: 'update',
    asset_prefix: 'ota/agenda-de-boteco/production/rt-1/rel-1/',
    manifest: { launchAsset: { key: 'k1' }, assets: [], metadata: {} },
    created_at: '2026-11-05T12:00:00.000Z',
  },
];

describe('buildRollbackRow', () => {
  it('republishes N-1 release with new id, new created_at, and source_release_id in previous mode', () => {
    const now = new Date('2026-11-07T18:00:00.000Z');
    const row = buildRollbackRow(sampleRows, {
      mode: 'previous',
      now,
      newId: 'new-rollback-uuid',
      gitSha: 'deadbeef',
    });

    assert.deepEqual(row, {
      id: 'new-rollback-uuid',
      app_slug: 'agenda-de-boteco',
      channel: 'production',
      platform: 'ios',
      runtime_version: 'rt-1',
      kind: 'update',
      asset_prefix: 'ota/agenda-de-boteco/production/rt-1/rel-2/',
      manifest: { launchAsset: { key: 'k2' }, assets: [], metadata: {} },
      source_release_id: 'rel-2',
      git_sha: 'deadbeef',
      created_at: '2026-11-07T18:00:00.000Z',
    });
  });

  it('throws when there is no N-1 release in previous mode', () => {
    assert.throws(
      () =>
        buildRollbackRow([sampleRows[0]], {
          mode: 'previous',
          now: new Date(),
          newId: 'new-uuid',
          gitSha: 'deadbeef',
        }),
      /Nenhuma release anterior para rollback/,
    );
  });

  it('creates rollback_embedded row with null manifest and asset_prefix in embedded mode', () => {
    const now = new Date('2026-11-07T19:00:00.000Z');
    const row = buildRollbackRow([sampleRows[0]], {
      mode: 'embedded',
      now,
      newId: 'embedded-uuid',
      gitSha: 'cafebabe',
    });

    assert.deepEqual(row, {
      id: 'embedded-uuid',
      app_slug: 'agenda-de-boteco',
      channel: 'production',
      platform: 'ios',
      runtime_version: 'rt-1',
      kind: 'rollback_embedded',
      asset_prefix: null,
      manifest: null,
      source_release_id: null,
      git_sha: 'cafebabe',
      created_at: '2026-11-07T19:00:00.000Z',
    });
  });
});
